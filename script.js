document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const dropZone = document.getElementById('drop-zone');
    const imageLoader = document.getElementById('imageLoader');
    const pixelWidthInput = document.getElementById('pixelWidth');
    const pixelHeightInput = document.getElementById('pixelHeight');
    const aspectRatioLock = document.getElementById('aspectRatioLock'); // ★★★ 変更点 ★★★
    const convertBtn = document.getElementById('convertBtn');
    const originalCanvas = document.getElementById('originalCanvas');
    const pixelatedCanvas = document.getElementById('pixelatedCanvas');
    const downloadFormatSelect = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');

    const originalCtx = originalCanvas.getContext('2d');
    const pixelatedCtx = pixelatedCanvas.getContext('2d');

    let originalImage = null;
    let aspectRatio = 1; // ★★★ 変更点 ★★★

    // --- ① 画像アップロード関連のイベントリスナー ---
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

    // --- ファイル処理の共通関数 ---
    function handleFile(file) {
        if (!file.type.startsWith('image/')) return alert('画像ファイルを選択してください。');
        const reader = new FileReader();
        reader.onload = event => {
            originalImage = new Image();
            originalImage.onload = () => {
                // ★★★ 変更点：縦横比を計算し、入力欄に反映 ★★★
                aspectRatio = originalImage.width / originalImage.height;
                pixelWidthInput.value = 64;
                pixelHeightInput.value = Math.round(64 / aspectRatio);
                
                drawImageToCanvas(originalImage, originalCanvas, originalCtx);
                pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
                downloadBtn.disabled = true;
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // --- ★★★ 変更点：縦横比を固定するための入力イベントリスナー ★★★
    pixelWidthInput.addEventListener('input', () => {
        if (aspectRatioLock.checked && aspectRatio) {
            const newWidth = parseInt(pixelWidthInput.value);
            if (!isNaN(newWidth) && newWidth > 0) {
                pixelHeightInput.value = Math.round(newWidth / aspectRatio);
            }
        }
    });

    pixelHeightInput.addEventListener('input', () => {
        if (aspectRatioLock.checked && aspectRatio) {
            const newHeight = parseInt(pixelHeightInput.value);
            if (!isNaN(newHeight) && newHeight > 0) {
                pixelWidthInput.value = Math.round(newHeight * aspectRatio);
            }
        }
    });
    
    // --- 変換開始ボタンの機能 ---
    convertBtn.addEventListener('click', () => {
        if (!originalImage) return alert('先に画像をアップロードしてください。');
        pixelate();
    });

    // --- ドット絵に変換する処理 ---
    function pixelate() {
        const pixelWidth = parseInt(pixelWidthInput.value);
        const pixelHeight = parseInt(pixelHeightInput.value);

        if (isNaN(pixelWidth) || isNaN(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) {
            return alert('有効な縦横ピクセル数を入力してください。');
        }

        pixelatedCanvas.width = originalCanvas.width;
        pixelatedCanvas.height = originalCanvas.height;

        pixelatedCtx.imageSmoothingEnabled = false;
        pixelatedCtx.drawImage(originalImage, 0, 0, pixelWidth, pixelHeight);
        pixelatedCtx.drawImage(
            pixelatedCanvas, 0, 0, pixelWidth, pixelHeight,
            0, 0, pixelatedCanvas.width, pixelatedCanvas.height
        );

        downloadBtn.disabled = false;
    }

    // --- ダウンロード機能 ---
    downloadBtn.addEventListener('click', () => {
        const format = downloadFormatSelect.value;
        const extension = format.split('/')[1];
        const link = document.createElement('a');
        link.href = pixelatedCanvas.toDataURL(format, 1.0);
        link.download = `pixel-art.${extension}`;
        link.click();
    });

    // --- ヘルパー関数：画像をキャンバスに描画 ---
    function drawImageToCanvas(image, canvas, context) {
        const parentWidth = canvas.parentElement.clientWidth - 32; // padding分を考慮
        
        let width = image.width;
        let height = image.height;

        if (width > parentWidth) {
            height *= parentWidth / width;
            width = parentWidth;
        }

        canvas.width = width;
        canvas.height = height;

        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
    }
});