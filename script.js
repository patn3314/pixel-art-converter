document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const dropZone = document.getElementById('drop-zone');
    const imageLoader = document.getElementById('imageLoader');
    const pixelWidthInput = document.getElementById('pixelWidth');
    const pixelHeightInput = document.getElementById('pixelHeight');
    const aspectRatioLock = document.getElementById('aspectRatioLock');
    const colorSlider = document.getElementById('colorSlider');
    const colorValue = document.getElementById('colorValue');
    const outlineSlider = document.getElementById('outlineSlider');
    const outlineValue = document.getElementById('outlineValue');
    const convertBtn = document.getElementById('convertBtn');
    const loading = document.getElementById('loading');
    const originalCanvas = document.getElementById('originalCanvas');
    const pixelatedCanvas = document.getElementById('pixelatedCanvas');
    const downloadFormatSelect = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');

    const originalCtx = originalCanvas.getContext('2d');
    const pixelatedCtx = pixelatedCanvas.getContext('2d');

    let originalImage = null;
    let aspectRatio = 1;

    // --- イベントリスナー設定 ---
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    dropZone.addEventListener('click', () => imageLoader.click());
    imageLoader.addEventListener('change', e => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    pixelWidthInput.addEventListener('input', () => updatePixelInputs('width'));
    pixelHeightInput.addEventListener('input', () => updatePixelInputs('height'));
    colorSlider.addEventListener('input', updateColorSlider);
    outlineSlider.addEventListener('input', updateOutlineSlider);
    convertBtn.addEventListener('click', processImage);

    // --- 初期化処理 ---
    updateColorSlider();
    updateOutlineSlider();

    // --- 関数定義 ---
    function handleFile(file) {
        if (!file.type.startsWith('image/')) return alert('画像ファイルを選択してください。');
        const reader = new FileReader();
        reader.onload = event => {
            originalImage = new Image();
            originalImage.onload = () => {
                aspectRatio = originalImage.width / originalImage.height;
                pixelWidthInput.value = 128;
                updatePixelInputs('width');
                
                drawImageToCanvas(originalImage, originalCanvas, originalCtx);
                pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
                downloadBtn.disabled = true;
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function updatePixelInputs(source) {
        if (!aspectRatioLock.checked || !aspectRatio) return;
        const width = parseInt(pixelWidthInput.value);
        const height = parseInt(pixelHeightInput.value);

        if (source === 'width' && !isNaN(width)) {
            pixelHeightInput.value = Math.round(width / aspectRatio);
        } else if (source === 'height' && !isNaN(height)) {
            pixelWidthInput.value = Math.round(height * aspectRatio);
        }
    }

    function updateColorSlider() {
        const colorLevels = [4, 8, 16, 32, 64, '無制限'];
        colorValue.textContent = colorLevels[colorSlider.value - 1];
    }

    function updateOutlineSlider() {
        const outlineLevels = ['なし', '弱い', '普通', '強い'];
        outlineValue.textContent = outlineLevels[outlineSlider.value];
    }

    function processImage() {
        if (!originalImage) return alert('先に画像をアップロードしてください。');
        
        loading.classList.remove('hidden');
        convertBtn.disabled = true;
        
        // UIが更新されるように、重い処理を少し遅延させる
        setTimeout(() => {
            // 1. 一時的なCanvasにフィルター適用前の元画像を描画
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            tempCtx.drawImage(originalImage, 0, 0);
            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            // 2. 画質調整フィルターを適用
            imageData = applyColorReduction(imageData);
            imageData = applyOutlines(imageData);
            tempCtx.putImageData(imageData, 0, 0);

            // 3. フィルター適用後の画像を元にピクセル化
            pixelate(tempCanvas);

            loading.classList.add('hidden');
            convertBtn.disabled = false;
            downloadBtn.disabled = false;
        }, 10);
    }

    // ★★★ 新機能：減色処理 ★★★
    function applyColorReduction(imageData) {
        const level = parseInt(colorSlider.value);
        if (level >= 6) return imageData; // 無制限の場合は処理しない
        
        const colorCount = [4, 8, 16, 32, 64][level - 1];
        const factor = 256 / colorCount;
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / factor) * factor;     // Red
            data[i + 1] = Math.round(data[i + 1] / factor) * factor; // Green
            data[i + 2] = Math.round(data[i + 2] / factor) * factor; // Blue
        }
        return imageData;
    }
    
    // ★★★ 新機能：輪郭線検出処理 (ソーベルフィルター) ★★★
    function applyOutlines(imageData) {
        const level = parseInt(outlineSlider.value);
        if (level === 0) return imageData; // なしの場合は処理しない

        const threshold = [0, 60, 40, 20][level];
        const { data, width, height } = imageData;
        const grayData = new Uint8ClampedArray(width * height);
        const edgeData = new Uint8ClampedArray(width * height);

        // グレースケール化
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }

        // ソーベルフィルター
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                const gx = -grayData[i - 1 - width] - 2 * grayData[i - 1] - grayData[i - 1 + width] +
                            grayData[i + 1 - width] + 2 * grayData[i + 1] + grayData[i + 1 + width];
                const gy = -grayData[i - 1 - width] - 2 * grayData[i - width] - grayData[i + 1 - width] +
                            grayData[i - 1 + width] + 2 * grayData[i + width] + grayData[i + 1 + width];
                edgeData[i] = Math.sqrt(gx * gx + gy * gy);
            }
        }

        // 輪郭を元の画像に合成
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            if (edgeData[j] > threshold) {
                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; // 輪郭を黒にする
            }
        }
        return imageData;
    }

    function pixelate(sourceImage) {
        const pixelWidth = parseInt(pixelWidthInput.value);
        const pixelHeight = parseInt(pixelHeightInput.value);
        if (isNaN(pixelWidth) || isNaN(pixelHeight)) return;

        pixelatedCanvas.width = originalCanvas.width;
        pixelatedCanvas.height = originalCanvas.height;
        pixelatedCtx.imageSmoothingEnabled = false;
        
        pixelatedCtx.drawImage(sourceImage, 0, 0, pixelWidth, pixelHeight);
        pixelatedCtx.drawImage(pixelatedCanvas, 0, 0, pixelWidth, pixelHeight, 0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
    }
    
    downloadBtn.addEventListener('click', () => {
        const format = downloadFormatSelect.value;
        const link = document.createElement('a');
        link.href = pixelatedCanvas.toDataURL(format, 1.0);
        link.download = `game-art.${format.split('/')[1]}`;
        link.click();
    });

    function drawImageToCanvas(image, canvas, context) {
        const parentWidth = canvas.parentElement.clientWidth - 32;
        let width = image.width;
        let height = image.height;
        if (width > parentWidth) {
            height *= parentWidth / width;
            width = parentWidth;
        }
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
    }
});