import onnxruntime as ort
import numpy as np

try:
    session = ort.InferenceSession("deepfake_v2.onnx")
    print("Inputs:")
    for i in session.get_inputs():
        print(f" Name: {i.name}, Shape: {i.shape}, Type: {i.type}")
    print("\nOutputs:")
    for o in session.get_outputs():
        print(f" Name: {o.name}, Shape: {o.shape}, Type: {o.type}")
except Exception as e:
    print(f"Error loading ONNX: {e}")
