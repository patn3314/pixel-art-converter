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
    downloadBtn.addEventListener('click', downloadImage);

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
        reader.readDataURL(file);
    }
    
    function updatePixelInputs(source) {
        if (!aspectRatioLock.checked || !aspectRatio) return;
        const width = parseInt(pixelWidthInput.value);
        const height = parseInt(pixelHeightInput.value);

        if (source === 'width' && !isNaN(width) && width > 0) {
            pixelHeightInput.value = Math.round(width / aspectRatio);
        } else if (source === 'height' && !isNaN(height) && height > 0) {
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
        
        setTimeout(() => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            tempCtx.drawImage(originalImage, 0, 0);
            let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            imageData = applyColorReduction(imageData);
            imageData = applyOutlines(imageData);
            tempCtx.putImageData(imageData, 0, 0);

            pixelate(tempCanvas);

            loading.classList.add('hidden');
            convertBtn.disabled = false;
            downloadBtn.disabled = false;
        }, 10);
    }

    function applyColorReduction(imageData) {
        const level = parseInt(colorSlider.value);
        if (level >= 6) return imageData;
        
        const colorCount = [4, 8, 16, 32, 64][level - 1];
        const factor = 255 / (colorCount - 1);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / factor) * factor;
            data[i + 1] = Math.round(data[i + 1] / factor) * factor;
            data[i + 2] = Math.round(data[i + 2] / factor) * factor;
        }
        return imageData;
    }
    
    function applyOutlines(imageData) {
        const level = parseInt(outlineSlider.value);
        if (level === 0) return imageData;

        const threshold = [0, 60, 40, 20][level];
        const { data, width, height } = imageData;
        const grayData = new Uint8ClampedArray(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            grayData[j] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        
        const edgeData = new Uint8ClampedArray(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                const gx = -grayData[i-1-width] - 2*grayData[i-1] - grayData[i-1+width] + grayData[i+1-width] + 2*grayData[i+1] + grayData[i+1+width];
                const gy = -grayData[i-1-width] - 2*grayData[i-width] - grayData[i+1-width] + grayData[i-1+width] + 2*grayData[i+width] + grayData[i+1+width];
                edgeData[i] = Math.sqrt(gx * gx + gy * gy);
            }
        }

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            if (edgeData[j] > threshold) {
                data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
            }
        }
        return imageData;
    }

    // ★★★ 変更点：ピクセル化のアルゴリズムを刷新 ★★★
    function pixelate(sourceCanvas) {
        const pixelWidth = parseInt(pixelWidthInput.value);
        const pixelHeight = parseInt(pixelHeightInput.value);
        if (isNaN(pixelWidth) || isNaN(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) return;

        // 出力キャンバスのサイズを設定
        pixelatedCanvas.width = originalCanvas.width;
        pixelatedCanvas.height = originalCanvas.height;
        pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);

        // ソース画像と出力キャンバスの1ピクセルあたりのサイズを計算
        const sourceBlockWidth = sourceCanvas.width / pixelWidth;
        const sourceBlockHeight = sourceCanvas.height / pixelHeight;
        const destBlockWidth = pixelatedCanvas.width / pixelWidth;
        const destBlockHeight = pixelatedCanvas.height / pixelHeight;

        // ソース画像から色を取得するためのコンテキスト
        const sourceCtx = sourceCanvas.getContext('2d');

        // ピクセルごとに処理
        for (let y = 0; y < pixelHeight; y++) {
            for (let x = 0; x < pixelWidth; x++) {
                // サンプリングする座標を計算 (各ブロックの中央)
                const sourceX = Math.floor((x + 0.5) * sourceBlockWidth);
                const sourceY = Math.floor((y + 0.5) * sourceBlockHeight);

                // 1ピクセルの色データを取得
                const pixelData = sourceCtx.getImageData(sourceX, sourceY, 1, 1).data;
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                const a = pixelData[3] / 255;

                // 取得した色で出力キャンバスに矩形を描画
                pixelatedCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
                pixelatedCtx.fillRect(x * destBlockWidth, y * destBlockHeight, destBlockWidth, destBlockHeight);
            }
        }
    }
    
    function downloadImage() {
        const format = downloadFormatSelect.value;
        const link = document.createElement('a');
        link.href = pixelatedCanvas.toDataURL(format, 1.0);
        link.download = `dot-art.${format.split('/')[1]}`;
        link.click();
    }

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
