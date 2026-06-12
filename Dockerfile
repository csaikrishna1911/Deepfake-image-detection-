FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn
COPY . .
EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "--timeout", "120", "app:app"]