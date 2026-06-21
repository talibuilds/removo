document.addEventListener('DOMContentLoaded', () => {
    // ── DOM refs ──────────────────────────────────────────────────────────
    const dropZone        = document.getElementById('drop-zone');
    const fileInput       = document.getElementById('file-input');
    const originalPreview = document.getElementById('original-preview');
    const originalImg     = document.getElementById('original-img');
    const resetBtn        = document.getElementById('reset-btn');

    const processingState = document.getElementById('processing-state');
    const loadingState    = document.getElementById('loading-state');
    const resultState     = document.getElementById('result-state');
    const resultImg       = document.getElementById('result-img');
    const resultWrapper   = document.getElementById('result-wrapper');
    const downloadBtn     = document.getElementById('download-btn');

    // Enhancement sliders
    const brightness = document.getElementById('brightness');
    const contrast   = document.getElementById('contrast');
    const saturation = document.getElementById('saturation');
    const sharpness  = document.getElementById('sharpness');
    const sliders    = [brightness, contrast, saturation, sharpness];

    // BG swatches
    const swatches         = document.querySelectorAll('.swatch');
    const customColorInput = document.getElementById('custom-color-input');
    const swatchCustom     = document.getElementById('swatch-custom');

    // Transform controls
    const imgScale          = document.getElementById('img-scale');
    const imgX              = document.getElementById('img-x');
    const imgY              = document.getElementById('img-y');
    const scaleBadge        = document.getElementById('scale-badge');
    const xVal              = document.getElementById('x-val');
    const yVal              = document.getElementById('y-val');
    const alignBtns         = document.querySelectorAll('.align-btn');
    const resetTransformBtn = document.getElementById('reset-transform-btn');

    // Mode toggle
    const modeQuickBtn = document.getElementById('mode-quick');
    const modeDeepBtn  = document.getElementById('mode-deep');
    let   activeMode   = 'quick'; // 'quick' | 'deep'

    // Upscale refs
    const upscale2xBtn = document.getElementById('upscale-2x');
    const upscale4xBtn = document.getElementById('upscale-4x');
    const upscaleHint  = document.getElementById('upscale-hint');
    let   isUpscaling  = false;

    // AI loader refs
    const aiCanvas      = document.getElementById('ai-canvas');
    const aiProgressBar = document.getElementById('ai-progress-bar');
    const aiPercent     = document.getElementById('ai-percent');
    const aiSteps       = document.querySelectorAll('.ai-step');
    let   loaderTimer   = null;

    // ── App state ────────────────────────────────────────────────────────
    let currentFile             = null;
    let baseResultBlob          = null;
    let currentResultBlob       = null;
    let activeBg                = 'transparent';
    let isProcessingEnhancement = false;
    let enhancementTimeout      = null;

    // ═══════════════════════════════════════════════
    // THEME TOGGLE
    // ═══════════════════════════════════════════════
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('removo-theme') || 'light';
    htmlEl.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem('removo-theme', next);
    });

    // ═══════════════════════════════════════════════
    // MODE TOGGLE
    // ═══════════════════════════════════════════════
    [modeQuickBtn, modeDeepBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            if (activeMode === btn.dataset.mode) return; // No change
            
            [modeQuickBtn, modeDeepBtn].forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeMode = btn.dataset.mode;
            
            // If we already have an image loaded, re-process it automatically
            if (currentFile && !isProcessingEnhancement && !isUpscaling && !loadingState.classList.contains('hidden') === false) {
                removeBackground();
            }
        });
    });

    // ═══════════════════════════════════════════════
    // DRAG & DROP
    // ═══════════════════════════════════════════════
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
    resetBtn.addEventListener('click', resetApp);

    // ═══════════════════════════════════════════════
    // AI LOADER ANIMATION
    // ═══════════════════════════════════════════════
    const STEP_TIMINGS_QUICK = [400, 700, 1200, 1800, 2200];
    const STEP_TIMINGS_DEEP  = [600, 1500, 4000, 7000, 9000];

    function startLoaderAnimation(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const tmpImg = new Image();
            tmpImg.onload = () => {
                const ctx = aiCanvas.getContext('2d');
                aiCanvas.width  = aiCanvas.offsetWidth  || 200;
                aiCanvas.height = aiCanvas.offsetHeight || 160;
                const scale = Math.max(aiCanvas.width / tmpImg.width, aiCanvas.height / tmpImg.height);
                const sw = tmpImg.width * scale;
                const sh = tmpImg.height * scale;
                const sx = (aiCanvas.width  - sw) / 2;
                const sy = (aiCanvas.height - sh) / 2;
                ctx.drawImage(tmpImg, sx, sy, sw, sh);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(0, 0, aiCanvas.width, aiCanvas.height);
            };
            tmpImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Reset step UI
        aiSteps.forEach(s => { s.classList.remove('active', 'done'); });
        aiProgressBar.style.width = '0%';
        aiPercent.textContent = '0%';

        const timings = activeMode === 'deep' ? STEP_TIMINGS_DEEP : STEP_TIMINGS_QUICK;
        const totalMs = timings[timings.length - 1] + 800;

        timings.forEach((t, i) => {
            setTimeout(() => {
                aiSteps.forEach((s, j) => {
                    if (j < i)  { s.classList.remove('active'); s.classList.add('done'); }
                    if (j === i){ s.classList.add('active'); s.classList.remove('done'); }
                    if (j > i)  { s.classList.remove('active', 'done'); }
                });
            }, t);
        });

        const startTime = Date.now();
        function tick() {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(95, (elapsed / totalMs) * 100);
            aiProgressBar.style.width = pct + '%';
            aiPercent.textContent = Math.floor(pct) + '%';
            if (pct < 95) loaderTimer = requestAnimationFrame(tick);
        }
        loaderTimer = requestAnimationFrame(tick);
    }

    function stopLoaderAnimation() {
        if (loaderTimer) { cancelAnimationFrame(loaderTimer); loaderTimer = null; }
        aiProgressBar.style.width = '100%';
        aiPercent.textContent = '100%';
        aiSteps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
    }

    // ═══════════════════════════════════════════════
    // ENHANCEMENT SLIDERS
    // ═══════════════════════════════════════════════
    sliders.forEach(s => s.addEventListener('input', () => {
        if (enhancementTimeout) clearTimeout(enhancementTimeout);
        enhancementTimeout = setTimeout(applyEnhancements, 300);
    }));

    // ═══════════════════════════════════════════════
    // BG SWATCHES
    // ═══════════════════════════════════════════════
    swatches.forEach(sw => {
        sw.addEventListener('click', () => {
            if (sw.id === 'swatch-custom') return;
            setActiveSwatch(sw);
            activeBg = sw.dataset.bg;
            applyBgToPreview();
        });
    });
    customColorInput.addEventListener('input', () => {
        setActiveSwatch(swatchCustom);
        activeBg = customColorInput.value;
        applyBgToPreview();
    });
    customColorInput.addEventListener('change', () => {
        setActiveSwatch(swatchCustom);
        activeBg = customColorInput.value;
        applyBgToPreview();
    });
    function setActiveSwatch(target) {
        swatches.forEach(s => s.classList.remove('active'));
        target.classList.add('active');
    }

    // ═══════════════════════════════════════════════
    // TRANSFORM CONTROLS
    // ═══════════════════════════════════════════════
    imgScale.addEventListener('input', () => {
        scaleBadge.textContent = imgScale.value + '%';
        applyTransform();
    });
    imgX.addEventListener('input', () => { xVal.textContent = imgX.value; applyTransform(); });
    imgY.addEventListener('input', () => { yVal.textContent = imgY.value; applyTransform(); });

    alignBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.dx === 'reset') {
                imgX.value = 0; imgY.value = 0;
                alignBtns.forEach(b => b.classList.remove('active-align'));
                btn.classList.add('active-align');
            } else {
                const newX = Math.max(-80, Math.min(80, parseFloat(imgX.value) + parseFloat(btn.dataset.dx)));
                const newY = Math.max(-80, Math.min(80, parseFloat(imgY.value) + parseFloat(btn.dataset.dy)));
                imgX.value = newX; imgY.value = newY;
                alignBtns.forEach(b => b.classList.remove('active-align'));
            }
            xVal.textContent = imgX.value;
            yVal.textContent = imgY.value;
            applyTransform();
        });
    });

    resetTransformBtn.addEventListener('click', () => {
        imgScale.value = 100; imgX.value = 0; imgY.value = 0;
        scaleBadge.textContent = '100%';
        xVal.textContent = '0'; yVal.textContent = '0';
        alignBtns.forEach(b => b.classList.remove('active-align'));
        document.querySelector('.align-btn[data-dx="reset"]').classList.add('active-align');
        applyTransform();
    });

    function applyTransform() {
        const s = imgScale.value / 100;
        resultImg.style.transform = `translate(${imgX.value}%, ${imgY.value}%) scale(${s})`;
    }

    // ═══════════════════════════════════════════════
    // DOWNLOAD (bakes bg + transform onto canvas)
    // ═══════════════════════════════════════════════
    downloadBtn.addEventListener('click', () => {
        if (!currentResultBlob) return;
        const scaleVal = imgScale.value / 100;
        const xPct     = parseFloat(imgX.value);
        const yPct     = parseFloat(imgY.value);
        const img      = new Image();
        const rawUrl   = URL.createObjectURL(currentResultBlob);

        img.onload = () => {
            const W = img.naturalWidth, H = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');

            if (activeBg !== 'transparent') {
                if (activeBg === 'gradient') {
                    const grd = ctx.createLinearGradient(0, 0, W, H);
                    grd.addColorStop(0, '#f97316'); grd.addColorStop(1, '#ec4899');
                    ctx.fillStyle = grd;
                } else { ctx.fillStyle = activeBg; }
                ctx.fillRect(0, 0, W, H);
            }
            const sW = W * scaleVal, sH = H * scaleVal;
            const cx = W / 2 + (xPct / 100) * W;
            const cy = H / 2 + (yPct / 100) * H;
            ctx.drawImage(img, cx - sW / 2, cy - sH / 2, sW, sH);
            URL.revokeObjectURL(rawUrl);

            canvas.toBlob(blobPng => {
                const MAX_SIZE = 5 * 1024 * 1024;
                if (blobPng.size <= MAX_SIZE) {
                    triggerDownload(blobPng, 'png');
                } else {
                    canvas.toBlob(blobWebp => {
                        triggerDownload(blobWebp, 'webp');
                    }, 'image/webp', 0.95);
                }
            }, 'image/png');
        };
        img.src = rawUrl;
    });

    function triggerDownload(blob, ext) {
        const url = URL.createObjectURL(blob);
        const a   = Object.assign(document.createElement('a'), { href: url, download: `removo_${Date.now()}.${ext}` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ═══════════════════════════════════════════════
    // BG PREVIEW (CSS-only, instant)
    // ═══════════════════════════════════════════════
    function applyBgToPreview() {
        if (activeBg === 'transparent') {
            resultWrapper.style.backgroundImage = `repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%)`;
            resultWrapper.style.backgroundSize  = '14px 14px';
            resultWrapper.style.backgroundColor = '';
        } else if (activeBg === 'gradient') {
            resultWrapper.style.backgroundImage = 'linear-gradient(135deg, #f97316, #ec4899)';
            resultWrapper.style.backgroundSize  = '';
            resultWrapper.style.backgroundColor = '';
        } else {
            resultWrapper.style.backgroundImage = 'none';
            resultWrapper.style.backgroundSize  = '';
            resultWrapper.style.backgroundColor = activeBg;
        }
    }

    // ═══════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════
    function resetApp() {
        currentFile = null; baseResultBlob = null; currentResultBlob = null;
        activeBg = 'transparent'; fileInput.value = '';

        dropZone.classList.remove('hidden');
        originalPreview.classList.add('hidden');
        processingState.classList.remove('hidden');
        loadingState.classList.add('hidden');
        resultState.classList.add('hidden');

        sliders.forEach(s => s.value = 1);
        setActiveSwatch(document.getElementById('swatch-transparent'));

        imgScale.value = 100; imgX.value = 0; imgY.value = 0;
        scaleBadge.textContent = '100%';
        xVal.textContent = '0'; yVal.textContent = '0';
        resultImg.style.transform = '';
        resultWrapper.style.backgroundImage = '';
        resultWrapper.style.backgroundColor = '';
        alignBtns.forEach(b => b.classList.remove('active-align'));
        document.querySelector('.align-btn[data-dx="reset"]').classList.add('active-align');

        stopLoaderAnimation();
    }

    // ═══════════════════════════════════════════════
    // FILE HANDLER
    // ═══════════════════════════════════════════════
    function handleFile(file) {
        if (!file.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
        currentFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            originalImg.src = e.target.result;
            dropZone.classList.add('hidden');
            originalPreview.classList.remove('hidden');
            removeBackground();
        };
        reader.readAsDataURL(file);
    }

    // ═══════════════════════════════════════════════
    // REMOVE BACKGROUND (server)
    // ═══════════════════════════════════════════════
    async function removeBackground() {
        processingState.classList.add('hidden');
        resultState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        startLoaderAnimation(currentFile);

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('mode', activeMode);

        try {
            const response = await fetch('/remove-bg', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Failed');
            const blob = await response.blob();
            baseResultBlob = blob; currentResultBlob = blob;

            stopLoaderAnimation();
            await new Promise(r => setTimeout(r, 300));

            updateResultImage(blob);
            applyBgToPreview();
            loadingState.classList.add('hidden');
            resultState.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            stopLoaderAnimation();
            alert('An error occurred while removing the background.');
            resetApp();
        }
    }

    // ═══════════════════════════════════════════════
    // ENHANCEMENTS (server)
    // ═══════════════════════════════════════════════
    async function applyEnhancements() {
        if (!baseResultBlob || isProcessingEnhancement) return;
        if (sliders.every(s => parseFloat(s.value) === 1)) {
            currentResultBlob = baseResultBlob;
            updateResultImage(baseResultBlob);
            return;
        }
        isProcessingEnhancement = true;
        resultImg.style.opacity = '0.5';

        const formData = new FormData();
        formData.append('image', new File([baseResultBlob], 'base.png', { type: 'image/png' }));
        formData.append('brightness', brightness.value);
        formData.append('contrast',   contrast.value);
        formData.append('saturation', saturation.value);
        formData.append('sharpness',  sharpness.value);

        try {
            const response = await fetch('/enhance', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Enhancement failed');
            const blob = await response.blob();
            currentResultBlob = blob;
            updateResultImage(blob);
        } catch (err) {
            console.error(err);
        } finally {
            isProcessingEnhancement = false;
            resultImg.style.opacity = '1';
        }
    }

    // ═══════════════════════════════════════════════
    // UPSCALE (server)
    // ═══════════════════════════════════════════════
    [upscale2xBtn, upscale4xBtn].forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentResultBlob || isUpscaling) return;
            
            const scale = btn.dataset.scale;
            isUpscaling = true;
            upscaleHint.textContent = `Upscaling ${scale}x...`;
            btn.classList.add('active-align');
            resultImg.style.opacity = '0.5';

            const formData = new FormData();
            formData.append('image', new File([currentResultBlob], 'result.png', { type: 'image/png' }));
            formData.append('scale', scale);

            try {
                const response = await fetch('/upscale', { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Upscale failed');
                const blob = await response.blob();
                currentResultBlob = blob;
                updateResultImage(blob);
                upscaleHint.textContent = `Done (${scale}×)`;
            } catch (err) {
                console.error(err);
                upscaleHint.textContent = 'Failed';
            } finally {
                isUpscaling = false;
                resultImg.style.opacity = '1';
                setTimeout(() => { btn.classList.remove('active-align'); }, 500);
            }
        });
    });

    // ═══════════════════════════════════════════════
    // UPDATE RESULT IMAGE
    // ═══════════════════════════════════════════════
    function updateResultImage(blob) {
        currentResultBlob = blob;
        const oldUrl = resultImg.src;
        const url    = URL.createObjectURL(blob);
        resultImg.onload = () => {
            if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
        };
        resultImg.src = url;
    }
});
