import io
import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
from PIL import Image, ImageEnhance

app = FastAPI(title="BG Remover App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pre-load both AI sessions at startup ──────────────────────────────────────
# Quick  → isnet-general-use  (~170 MB, fast, good quality)
# Deep   → birefnet-general   (~970 MB, slower, best quality – hair / fine edges)
print("Loading Quick session (ISNet)...")
session_quick = new_session("isnet-general-use")
print("Loading Deep session (BiRefNet)...")
session_deep  = new_session("birefnet-general")
print("Both AI sessions ready.")

# ── Image Processing Helpers ───────────────────────────────────────────────────

def _to_png_bytes(img: Image.Image) -> bytes:
    """Lossless PNG export."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()

def _clean_edges(img: Image.Image) -> Image.Image:
    """
    Removes the white/dark halo and blurry borders.
    1. Erodes the alpha mask slightly to cut out background bleed.
    2. Thresholds the mask to be 100% razor sharp (no blur).
    """
    from PIL import ImageFilter
    if img.mode != "RGBA":
        img = img.convert("RGBA")
        
    r, g, b, a = img.split()
    
    # Erode the mask by 1 pixel to remove the outer halo ring
    a = a.filter(ImageFilter.MinFilter(3))
    
    # Hard threshold to eliminate any semi-transparent blur
    # Anything > 127 becomes 255 (solid), else 0 (transparent)
    a = a.point(lambda p: 255 if p > 127 else 0)
    
    return Image.merge("RGBA", (r, g, b, a))

def _upscale_rgba(img: Image.Image, scale: int) -> Image.Image:
    """
    Upscale using Bicubic (less ringing than Lanczos) and then 
    clean the edges to prevent any upscale-induced halos.
    """
    target_w = img.width  * scale
    target_h = img.height * scale
    
    # Resize with BICUBIC to avoid the severe ringing (halos) of Lanczos
    up = img.resize((target_w, target_h), Image.BICUBIC)
    
    # Re-sharpen and erode the edges after upscale to prevent blurry borders
    return _clean_edges(up)

# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

if os.path.isdir("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"status": "ok", "message": "Removo API is running."}


@app.post("/remove-bg")
async def remove_background(
    image: UploadFile = File(...),
    mode:  str        = Form("quick"),   # "quick" | "deep"
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        contents    = await image.read()
        input_image = Image.open(io.BytesIO(contents)).convert("RGBA")

        session     = session_deep if mode == "deep" else session_quick
        output_image = remove(input_image, session=session)
        
        # Apply strict edge cleaning to remove AI blur and halos
        output_image = _clean_edges(output_image)

        return Response(content=_to_png_bytes(output_image), media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/enhance")
async def enhance_image(
    image:      UploadFile = File(...),
    brightness: float      = Form(1.0),
    contrast:   float      = Form(1.0),
    saturation: float      = Form(1.0),
    sharpness:  float      = Form(1.0),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        contents = await image.read()
        img      = Image.open(io.BytesIO(contents))

        if brightness != 1.0: img = ImageEnhance.Brightness(img).enhance(brightness)
        if contrast   != 1.0: img = ImageEnhance.Contrast(img).enhance(contrast)
        if saturation != 1.0: img = ImageEnhance.Color(img).enhance(saturation)
        if sharpness  != 1.0: img = ImageEnhance.Sharpness(img).enhance(sharpness)

        return Response(content=_to_png_bytes(img), media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upscale")
async def upscale_image(
    image: UploadFile = File(...),
    scale: int        = Form(2),   # 2 | 4
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    if scale not in (2, 4):
        raise HTTPException(status_code=400, detail="Scale must be 2 or 4.")

    try:
        contents  = await image.read()
        img       = Image.open(io.BytesIO(contents)).convert("RGBA")
        upscaled  = _upscale_rgba(img, scale)
        return Response(content=_to_png_bytes(upscaled), media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
