from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from detection_engine import analyze_media

app = Flask(__name__)
CORS(app)

# SQLite database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///history.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Model for Detection Records
class DetectionRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    result = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(50), nullable=False)
    manipulation_type = db.Column(db.String(100), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    features_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        try:
            features = json.loads(self.features_json)
        except Exception:
            features = {}
        return {
            "id": self.id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "result": self.result,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "manipulation_type": self.manipulation_type,
            "summary": self.summary,
            "features": features,
            "created_at": self.created_at.isoformat(),
            # Backward compatibility fields for the script.js frontend
            "filename": self.file_name,
            "label": self.result,
            "analyzed_at": self.created_at.isoformat()
        }

# Create database tables automatically
with app.app_context():
    db.create_all()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def home():
    return "Deepfake Detection API Running ✅"

@app.route("/api/detect", methods=["POST"])
def detect():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
            
        file = request.files["file"]
        
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Only JPG, PNG, WEBP, BMP, TIFF are supported."}), 400

        # Secure the filename and save it temporarily for the detection engine
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Send the file path and file type/mimetype to the new engine
        result = analyze_media(filepath, file.mimetype)
        
        if "error" in result:
             return jsonify(result), 400

        # Save result to database for persistence
        file_type = "video" if file.mimetype.startswith("video") or filename.split(".")[-1].lower() in ["mp4", "avi", "mov", "webm"] else "image"
        
        record = DetectionRecord(
            file_name=filename,
            file_type=file_type,
            result=result["result"],
            confidence=result["confidence"],
            risk_level=result["risk_level"],
            manipulation_type=result["manipulation_type"],
            summary=result["summary"],
            features_json=json.dumps(result["features"])
        )
        db.session.add(record)
        db.session.commit()

        # Add record ID to the output
        result["id"] = record.id

        # Clean up the file to save disk space
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as cleanup_err:
            print(f"Cleanup error: {cleanup_err}")

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"Server processing error: {str(e)}"}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    try:
        records = DetectionRecord.query.order_by(DetectionRecord.created_at.desc()).all()
        return jsonify({
            "detections": [r.to_dict() for r in records]
        })
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve history: {str(e)}"}), 500

@app.route("/api/history/<int:record_id>", methods=["DELETE"])
def delete_history_item(record_id):
    try:
        record = DetectionRecord.query.get(record_id)
        if not record:
            return jsonify({"error": "Record not found"}), 404
        db.session.delete(record)
        db.session.commit()
        return jsonify({"message": "Successfully deleted record"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete record: {str(e)}"}), 500

@app.route("/api/stats", methods=["GET"])
def get_stats():
    try:
        total = DetectionRecord.query.count()
        fakes = DetectionRecord.query.filter_by(result="Fake").count()
        reals = DetectionRecord.query.filter_by(result="Real").count()
        
        image_count = DetectionRecord.query.filter_by(file_type="image").count()
        video_count = DetectionRecord.query.filter_by(file_type="video").count()
        audio_count = DetectionRecord.query.filter_by(file_type="audio").count()
        
        return jsonify({
            "total": total,
            "fakes": fakes,
            "reals": reals,
            "by_type": {
                "image": image_count,
                "video": video_count,
                "audio": audio_count
            }
        })
    except Exception as e:
        return jsonify({"error": f"Failed to calculate stats: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)