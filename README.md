---
title: Removo API
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

<div align="center">
  <h1>Removo.</h1>
  <p><strong>Premium AI Background Removal & Upscaling Engine</strong></p>

  <p>
    <strong><a href="https://bgremovo.vercel.app">✨ Try the Live Demo ✨</a></strong>
  </p>

  <p>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://github.com/danielgatis/rembg"><img src="https://img.shields.io/badge/Rembg-Python-blue?style=for-the-badge&logo=python&logoColor=white" alt="Rembg" /></a>
    <a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
    <a href="https://huggingface.co/"><img src="https://img.shields.io/badge/Hugging%20Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=000" alt="Hugging Face" /></a>
  </p>
</div>

---

## 🚀 Overview

**Removo** is a state-of-the-art background removal and image manipulation tool built with a completely custom **hybrid architecture**. Designed for precision, speed, and aesthetics, it utilizes the latest machine learning models combined with a pristine, dual-theme UI.

### ✨ Key Features

- 🧠 **Dual AI Engines**: 
  - **Quick Mode**: Powered by `IS-Net` for blazing-fast inference with excellent quality.
  - **Deep Clean**: Powered by `BiRefNet` for surgical precision on complex borders like hair, fur, and intricate objects.
- 🔪 **Zero-Halo Edge Cleaning**: Custom `PIL` edge erosion routines that completely eliminate white halos and blur bleed from the generated masks, guaranteeing crisp edges.
- 🔍 **4K Upscaling**: Enhance your cutouts instantly with 2x and 4x upscaling, maintaining full fidelity without pixelation.
- 🎨 **Advanced Adjustments**: Built-in sliders for Brightness, Contrast, Saturation, and Sharpness.
- 🌓 **Dynamic Dual-Theme UI**: 
  - **Day Mode**: A realistic sky-blue gradient with slowly drifting clouds.
  - **Night Mode**: A deep space obsidian theme featuring a panning starfield and shooting stars.
- 📦 **Smart Export**: Automatically optimizes heavy high-resolution images to `WebP` if they exceed 5MB to ensure snappy downloads.

---

## 🏗️ Architecture

To circumvent standard serverless limitations (like Vercel's 250MB limit), Removo employs a robust **Hybrid Deployment Setup**:

* **Frontend**: A vanilla HTML/CSS/JS interface, perfect for edge deployment on platforms like Vercel. 
* **Backend**: A Dockerized FastAPI application designed to run on Hugging Face Spaces (or any Docker environment), allowing it to handle gigabytes of machine learning models seamlessly.

---

## 🛠️ Local Development

### Prerequisites
- Python 3.9+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/talibuilds/removo.git
   cd removo
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *Note: On first run, the AI models (`~1.1 GB`) will be automatically downloaded by `rembg`.*

3. **Start the backend server:**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Open the App:**
   Navigate to `http://localhost:8000` in your browser. The frontend is served directly by FastAPI during local development.

---

<div align="center">
  <p>Built by <a href="https://github.com/talibuilds">Talibuilds</a></p>
</div>
