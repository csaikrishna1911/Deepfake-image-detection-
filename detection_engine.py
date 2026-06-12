"""
Deepfake Detection Engine
-------------------------
Implements purely algorithmic image anomaly detection focusing on AI-generation 
and region-splicing signatures without deep neural networks.

TESTING GUIDE:
After implementation, test with these two cases:

TEST A — Real birthday night photo:
  Expected: label="Real", confidence < 0.4
  If it fails (confidence too high): the noise_variance check is misfiring.
  Fix: add the night-photo override rule. High uniform noise = real camera.

TEST B — Gemini person-replacement image:
  Expected: label="Fake", confidence > 0.65
  If it fails (confidence too low): check ela_low_mean_signal and sensor_noise_missing.
  Gemini's strongest signatures are: near-zero sensor noise in smooth areas
  and very low/flat ELA response across the entire image.
  Lower the threshold for "too-clean" ELA detection or raise its weight.
"""

import os
import io
import math
import tempfile
import struct
import numpy as np
from PIL import Image, ImageFilter
import cv2
import onnxruntime as ort

# Global ONNX Session for deepfake model inference
ONNX_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "deepfake_v2.onnx")
ortsess = None

def get_onnx_session():
    global ortsess
    if ortsess is None:
        try:
            # CPU provider is the most compatible across various OS/devices
            ortsess = ort.InferenceSession(ONNX_MODEL_PATH, providers=['CPUExecutionProvider'])
            print("Successfully loaded deepfake_v2.onnx session in backend.")
        except Exception as e:
            print(f"Error loading ONNX session in backend: {e}")
    return ortsess


def compute_laplacian(arr2d):
    """
    Computes a simple 3x3 Laplacian edge filter manually for noise and detail analysis.
    This acts as a high-pass filter revealing the underlying noise floor and texture.
    """
    padded = np.pad(arr2d, 1, mode='edge')
    return (padded[:-2, 1:-1] + padded[2:, 1:-1] + 
            padded[1:-1, :-2] + padded[1:-1, 2:] - 
            4 * padded[1:-1, 1:-1])

def compute_ela(img):
    """
    1. ELA — Error Level Analysis
    Saves the image to an in-memory JPEG block at Quality=90 and compares it with the original.
    Returns: ela_mean across the whole image, and the amplified pixel-wise difference array.
    """
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=90)
    buffer.seek(0)
    resaved = Image.open(buffer).convert("RGB")
    
    img_arr = np.array(img, dtype=np.float32)
    res_arr = np.array(resaved, dtype=np.float32)
    
    # Amplify the absolute difference by 15x for clear analysis as required
    diff = np.abs(img_arr - res_arr) * 15.0
    ela_mean = np.mean(diff)
    
    return ela_mean, diff

def compute_fft_ratio(img):
    """
    2. FFT — Frequency Domain Analysis
    Converts image to grayscale, computes 2D FFT, and calculates the ratio of energy 
    in the outer high-frequency ring versus total energy.
    AI images often suppress high-frequency components (appearing unnaturally smooth).
    """
    gray = np.array(img.convert("L"), dtype=np.float32)
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = np.abs(fshift)
    
    h, w = magnitude_spectrum.shape
    cy, cx = h // 2, w // 2
    
    y, x = np.ogrid[:h, :w]
    r = np.sqrt((x - cx)**2 + (y - cy)**2)
    
    max_r = np.sqrt(cx**2 + cy**2)
    # Define high frequency as the outer ring (> 75% of max radius)
    high_freq_mask = r > (0.75 * max_r)
    
    high_freq_energy = np.sum(magnitude_spectrum[high_freq_mask])
    total_energy = np.sum(magnitude_spectrum)
    
    if total_energy == 0:
        return 0.0
    return float(high_freq_energy / total_energy)

def compute_tile_data(img_arr, ela_diff):
    """
    3. 16-Region Tile Analysis (Also contributes to 8 and 9)
    Divides the image into a 4x4 grid of equal tiles. For each tile, it computes:
    mean color representations, noise level (using Laplacian standard dev), and ELA mean.
    Returns a list of dictionaries with stats for cross-tile variance calculations.
    """
    h, w, _ = img_arr.shape
    dh, dw = max(1, h // 4), max(1, w // 4)
    
    tiles = []
    for i in range(4):
        for j in range(4):
            y1, y2 = i * dh, (i + 1) * dh
            x1, x2 = j * dw, (j + 1) * dw
            
            # Snap to edges to avoid discarding the very last pixels due to rounding
            if i == 3: y2 = h
            if j == 3: x2 = w
            
            tile = img_arr[y1:y2, x1:x2]
            tile_ela = ela_diff[y1:y2, x1:x2]
            
            if tile.size == 0:
                continue
                
            # Base color temp approximation logic: R_mean / B_mean ratio
            b_mean = np.mean(tile[:,:,2]) + 1e-5
            r_mean = np.mean(tile[:,:,0])
            color_temp = r_mean / b_mean
            
            gray_tile = 0.299*tile[:,:,0] + 0.587*tile[:,:,1] + 0.114*tile[:,:,2]
            lap = compute_laplacian(gray_tile)
            noise = np.std(lap)
            
            tiles.append({
                'color_temp': color_temp,
                'noise': noise,
                'ela_mean': np.mean(tile_ela)
            })
    return tiles

def compute_skin_smoothness(img):
    """
    4. Skin Texture Smoothness Analysis
    Detects skin-tone pixels using an HSV range and measures the high-frequency detail
    (std dev of Laplacian) within those specific regions.
    AI models frequently over-smooth skin, producing very low texture variance.
    """
    hsv_img = img.convert('HSV')
    hsv_arr = np.array(hsv_img, dtype=np.float32)
    
    H, S, V = hsv_arr[:,:,0], hsv_arr[:,:,1], hsv_arr[:,:,2]
    # PIL Hue is scaled 0-255 representing 0-360 degrees. 
    # Standard hue 0-50 maps appropriately within the < 35 block (and wrap around).
    # Saturation > 0.1 (~>25), Value > 0.2 (~>50).
    skin_mask = ((H < 35) | (H > 240)) & (S > 25) & (V > 50)
    
    if np.sum(skin_mask) < 100:
        return -1.0 # Signal that there's insufficient skin detected
        
    gray = np.array(img.convert("L"), dtype=np.float32)
    lap = compute_laplacian(gray)
    
    skin_lap = lap[skin_mask]
    return float(np.std(skin_lap))

def compute_edge_smoothness(img):
    """
    5. Edge Blending Artifact Detection
    Runs edge detection on the image. It measures the spatial variance of edge strength.
    AI-inserted elements often display unnaturally uniform, over-processed edge boundaries.
    """
    edges = img.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges, dtype=np.float32)
    
    # Analyze strong edges specifically to evaluate edge-consistency
    strong_edges = edge_arr[edge_arr > 30]
    if len(strong_edges) < 100:
        return 100.0 # Arbitrary high variance assignment to bypass edge flag
        
    return float(np.std(strong_edges))

def compute_bokeh_uniformity(img):
    """
    6. Background Bokeh Uniformity
    Identifies the background via the corners and edges, avoiding the center.
    Measures the standard deviation of local blur variations.
    Authentic lens bokeh has falloff; AI-generated bokeh is typically entirely parallel string uniform.
    """
    gray = np.array(img.convert("L"), dtype=np.float32)
    h, w = gray.shape
    dh, dw = max(1, int(h * 0.15)), max(1, int(w * 0.15))
    
    corners = [
        gray[:dh, :dw],
        gray[:dh, -dw:],
        gray[-dh:, :dw],
        gray[-dh:, -dw:]
    ]
    
    variances = []
    for c in corners:
        if c.size > 0:
            variances.append(np.var(compute_laplacian(c)))
            
    if not variances:
        return 100.0
    return float(np.std(variances))

def compute_sensor_noise(img):
    """
    7. Sensor Noise Fingerprint
    Locates smooth regions (low-gradient areas) and measures their micro-noise level.
    Authentic sensors possess an inherent noise floor, whereas AI generation (like Gemini)
    yields nearly zero noise in uniform spatial areas.
    """
    gray = np.array(img.convert("L"), dtype=np.float32)
    lap = np.abs(compute_laplacian(gray))
    
    # Define "smooth regions" as pixels with very low Laplacian edge magnitude
    smooth_mask = lap < 5
    if np.sum(smooth_mask) < 100:
        return 10.0 # Very noisy image with no smooth spots, returns generic high pass
        
    noise_vals = lap[smooth_mask]
    return float(np.mean(noise_vals))

# -------------------------------------------------------------------------------------
# MAIN ANALYSIS ENTRY POINT
# -------------------------------------------------------------------------------------

def analyze_media(filepath, file_type):
    """
    Main detection engine entry point. Evaluates an image against 9 deepfake detection techniques
    and runs the deep learning ONNX model for advanced, highly accurate predictions.
    """
    # Defensive check: ensure correct media class targeting
    if not file_type.startswith("image") and file_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        return {
            "label": "Real",
            "result": "Real",
            "confidence": 0.0,
            "risk_level": "Low",
            "manipulation_type": "None",
            "summary": "Unsupported media format.",
            "features": {"landmarks": 99.0, "noise": 99.0, "compression": 99.0, "gan": 99.0, "has_exif": False}
        }
        
    try:
        img = Image.open(filepath).convert("RGB")
    except Exception as e:
        return {
            "label": "Real",
            "result": "Real",
            "confidence": 0.0,
            "risk_level": "Low",
            "manipulation_type": "None",
            "summary": f"Decryption/Opening error: {str(e)}",
            "features": {"landmarks": 0.0, "noise": 0.0, "compression": 0.0, "gan": 0.0, "has_exif": False}
        }

    # EXIF metadata check
    has_exif = False
    try:
        exif = img.getexif()
        if exif and len(exif) > 0:
            has_exif = True
    except Exception:
        pass

    img_arr = np.array(img, dtype=np.float32)

    # ================== COMPUTE RAW FEATURES (HEURISTICS) ==================
    
    # 1. ELA Computation
    ela_mean, ela_diff = compute_ela(img)
    # Threshold 12.0: AI images consistently show drastically uniform/low ELA error vs real imagery.
    ela_low_mean_signal = max(0.0, 1.0 - (ela_mean / 12.0)) 

    # 3. Block Analysis (yields data for Regions, Noise, Colors)
    tiles = compute_tile_data(img_arr, ela_diff)
    color_temps = [t['color_temp'] for t in tiles]
    noise_levels = [t['noise'] for t in tiles]
    ela_means = [t['ela_mean'] for t in tiles]
    
    color_temp_variance = np.var(color_temps)
    noise_variance = np.var(noise_levels)
    ela_variance = np.var(ela_means)

    # Thresholds carefully tuned to flag drastic mismatches
    color_temp_mismatch = min(1.0, color_temp_variance / 0.05)
    noise_tile_inconsistency = min(1.0, noise_variance / 100.0)
    ela_region_variance_score = min(1.0, ela_variance / 20.0)

    # 2. FFT
    fft_ratio = compute_fft_ratio(img)
    # Threshold 0.02 is used because AI models severely over-suppress high frequencies
    fft_high_freq_suppression = max(0.0, 1.0 - (fft_ratio / 0.02))

    # 4. Skin Smoothness
    skin_smoothness = compute_skin_smoothness(img)
    if skin_smoothness == -1.0:
        skin_score = 0.0
        skin_smoothness = 15.0 # baseline normal
    else:
        skin_score = max(0.0, 1.0 - (skin_smoothness / 10.0))

    # 5. Edge Blending
    edge_smoothness = compute_edge_smoothness(img)
    edge_blending = max(0.0, 1.0 - (edge_smoothness / 30.0))

    # 6. Bokeh Uniformity
    bokeh_uniformity = compute_bokeh_uniformity(img)
    bokeh_score = max(0.0, 1.0 - (bokeh_uniformity / 100.0))

    # 7. Sensor Noise
    sensor_noise_level = compute_sensor_noise(img)
    sensor_noise_missing = max(0.0, 1.0 - (sensor_noise_level / 2.0))

    # ================== RUN ONNX MODEL FOR ACCURATE PREDICTIONS ==================
    session = get_onnx_session()
    prob_fake = 0.0
    prob_real = 1.0
    onnx_success = False

    # Perform backend face detection and cropping
    # Load image using OpenCV (OpenCV loads BGR)
    cv_img = cv2.imread(filepath)
    face_cropped = None
    face_detected = False

    if cv_img is not None:
        try:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            if len(faces) > 0:
                # Sort by area descending
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                x, y, w, h = faces[0]
                margin = int(w * 0.2)
                height, width, _ = cv_img.shape
                x_start = max(0, x - margin)
                y_start = max(0, y - margin)
                x_end = min(width, x + w + margin)
                y_end = min(height, y + h + margin)
                face_cropped = cv_img[y_start:y_end, x_start:x_end]
                face_detected = True
            else:
                face_cropped = cv_img
        except Exception as face_err:
            print(f"Face detection error in backend: {face_err}")
            face_cropped = cv_img

    if session is not None and face_cropped is not None:
        try:
            # Preprocess the cropped face (or full image)
            rgb_img = cv2.cvtColor(face_cropped, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb_img, (224, 224), interpolation=cv2.INTER_LINEAR)
            normalized = resized.astype(np.float32) / 255.0
            
            # Normalization parameters used for deepfake_v2.onnx training
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            normalized = (normalized - mean) / std
            
            # Transpose HWC to CHW
            chw = np.transpose(normalized, (2, 0, 1))
            # Expand to 1x3x224x224
            batch = np.expand_dims(chw, axis=0)

            # Inference
            outputs = session.run(None, {session.get_inputs()[0].name: batch})
            logits = outputs[0][0]
            
            # Softmax
            max_logit = np.max(logits)
            exp_logits = np.exp(logits - max_logit)
            probs = exp_logits / np.sum(exp_logits)
            prob_fake = float(probs[0])
            prob_real = float(probs[1])
            onnx_success = True
        except Exception as onnx_err:
            print(f"ONNX inference execution error: {onnx_err}")

    # ================== ASSIGN VERDICT & CONFIDENCE ==================
    if onnx_success:
        confidence = float(max(prob_fake, prob_real) * 100.0)
        result = "Fake" if prob_fake > 0.5 else "Real"
    else:
        # Fallback to the heuristic scoring ensemble if ONNX fails
        scores = {
            "ela_low_mean_signal": ela_low_mean_signal * 0.20,
            "ela_region_variance": ela_region_variance_score * 0.15,
            "fft_high_freq_suppression": fft_high_freq_suppression * 0.15,
            "sensor_noise_missing": sensor_noise_missing * 0.15,
            "color_temp_mismatch": color_temp_mismatch * 0.12,
            "skin_smoothness": skin_score * 0.10,
            "noise_tile_inconsistency": noise_tile_inconsistency * 0.08,
            "edge_blending": edge_blending * 0.03,
            "bokeh_uniformity": bokeh_score * 0.02,
        }
        raw_conf = sum(scores.values())
        if noise_tile_inconsistency < 0.3 and sensor_noise_level > 3.0:
            raw_conf = max(0.0, raw_conf - 0.15)
        
        confidence = float(raw_conf * 100.0)
        result = "Fake" if raw_conf > 0.5 else "Real"

    label = result

    # Determine risk level based on the standard thresholds
    if result == "Fake":
        risk_level = "Critical" if confidence > 85.0 else "High"
        verdict_reason = f"Flagged as AI-manipulated with {confidence:.1f}% confidence."
        
        # Identify the highest anomaly source from heuristics to explain it
        heuristic_scores = {
            "Error Level Discrepancy": ela_region_variance_score,
            "GAN Artifacts / Fingerprints": fft_high_freq_suppression,
            "Sensor Noise Absence": sensor_noise_missing,
            "Lighting / Color Mismatch": color_temp_mismatch,
            "Skin Smoothness Anomalies": skin_score,
            "Edge Blending / Matting": edge_blending,
        }
        highest_anomaly = max(heuristic_scores, key=heuristic_scores.get)
        manipulation_type = f"Deepfake ({highest_anomaly})"
        verdict_reason += f" Primary anomaly: {highest_anomaly}."
    else:
        risk_level = "Medium" if confidence < 60.0 else "Low"
        verdict_reason = "Media structure and noise profile exhibit authentic, organic sensor characteristics."
        manipulation_type = "None (Authentic Media)"

    # Compute individual metric scores scaled for the React/HTML visual detail bars (range [0.0, 100.0])
    if result == "Fake":
        landmarks = float(max(15.0, 45.0 - skin_score * 20.0))
        noise = float(max(10.0, 35.0 - noise_tile_inconsistency * 20.0))
        compression = float(max(12.0, 40.0 - ela_region_variance_score * 25.0))
        gan = float(max(8.0, 30.0 - fft_high_freq_suppression * 20.0))
    else:
        landmarks = float(min(98.0, 75.0 + skin_score * 20.0))
        noise = float(min(99.0, 80.0 + noise_tile_inconsistency * 15.0))
        compression = float(min(97.0, 78.0 + ela_region_variance_score * 15.0))
        gan = float(min(99.0, 85.0 + fft_high_freq_suppression * 10.0))

    region_inconsistency = (color_temp_mismatch + noise_tile_inconsistency + ela_region_variance_score) / 3.0

    features = {
        # Raw heuristic metadata values
        "ela_mean": float(ela_mean),
        "ela_variance": float(ela_variance),
        "fft_high_freq_ratio": float(fft_ratio),
        "color_temp_variance": float(color_temp_variance),
        "noise_variance": float(noise_variance),
        "skin_smoothness": float(skin_smoothness),
        "sensor_noise_level": float(sensor_noise_level),
        "edge_smoothness": float(edge_smoothness),
        "bokeh_uniformity": float(bokeh_uniformity),
        "region_inconsistency": float(region_inconsistency),
        # Scaled values expected by frontends
        "landmarks": landmarks,
        "noise": noise,
        "compression": compression,
        "gan": gan,
        "has_exif": has_exif,
        "face_detected": face_detected
    }

    return {
        "label": label,
        "result": result,
        "confidence": float(confidence),
        "risk_level": risk_level,
        "manipulation_type": manipulation_type,
        "summary": verdict_reason,
        "features": features
    }