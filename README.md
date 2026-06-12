# DeepShield — Deepfake Detection System

AI-powered web platform to detect deepfakes in images, videos, and audio.

---

## Project Structure

```
deepfake-detection/
├── backend/
│   ├── app.py               # Flask API server
│   ├── detection_engine.py  # AI detection logic
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx          # Full React app
```

---

## Setup Instructions

### 1. Backend (Python/Flask)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Backend runs at: http://localhost:5000

Default admin account:
- Email: admin@deepfake.com
- Password: admin123

---

### 2. Frontend (React/Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Features

- User Registration & Login (JWT auth)
- Upload images (JPG, PNG), videos (MP4, AVI), audio (WAV, MP3)
- AI deepfake detection with confidence score
- Detailed feature analysis breakdown
- Detection history with delete option
- Admin panel (API: GET /api/admin/stats)
- SQLite database (auto-created on first run)

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | No | Register user |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/detect | Yes | Detect deepfake |
| GET | /api/history | Yes | Get history |
| DELETE | /api/history/:id | Yes | Delete record |
| GET | /api/admin/stats | Admin | System statistics |
| GET | /api/admin/users | Admin | All users |

---

## Upgrading to Real AI Model

Edit `backend/detection_engine.py` and replace the mock scoring with:

```python
# For images/video frames (EfficientNet)
import tensorflow as tf
model = tf.keras.models.load_model('models/efficientnet_deepfake.h5')

# For audio (spectrogram CNN)
import librosa
y, sr = librosa.load(filepath)
mel = librosa.feature.melspectrogram(y=y, sr=sr)
```

Recommended datasets for training:
- FaceForensics++ (video)
- DFDC — DeepFake Detection Challenge (video)
- ASVspoof 2019 (audio)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Inline CSS (no dependencies) |
| Backend | Python + Flask |
| Auth | JWT (flask-jwt-extended) |
| Database | SQLite (via SQLAlchemy) |
| AI Engine | Pluggable (mock → TF/PyTorch) |
