# Use official Python image
FROM python:3.10-slim

# Install system dependencies for OpenCV (required by rembg)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create user to run as non-root (Mandatory for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements and install
COPY --chown=user requirements.txt $HOME/app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download AI models into the Docker image so startup is instant
# (Otherwise the server will crash trying to download 1.2GB on the first request)
RUN python -c "import os; os.environ['U2NET_HOME'] = '/home/user/.u2net'; from rembg import new_session; new_session('isnet-general-use'); new_session('birefnet-general')"

# Copy the rest of your code
COPY --chown=user . $HOME/app

# Expose port 7860 (Hugging Face default port)
EXPOSE 7860

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
