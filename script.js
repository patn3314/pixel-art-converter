document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const dropZone = document.getElementById('drop-zone');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const imageLoader = document.getElementById('imageLoader');
    const pixelWidthInput = document.getElementById('pixelWidth');
    const pixelHeightInput = document.getElementById('pixelHeight');
    const convertBtn = document.getElementById('convertBtn');
    const originalCanvas = document.getElementById('originalCanvas');
    const pixelatedCanvas = document.getElementById('pixelatedCanvas');
    const downloadFormatSelect = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');

    const originalCtx = originalCanvas.getContext('2d');
    const pixelatedCtx = pixelatedCanvas.getContext('2d');

    let originalImage = null;

    // --- ①-a ドラッグ＆ドロップによる画像アップロード ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // dropZone自体をクリックしてもファイル選択できるようにする
    dropZone.addEventListener('click', () => imageLoader.click());
    
    // 「ファイルを選択」ボタンのクリックイベント
    fileSelectBtn.addEventListener('click', () => imageLoader.click());

    // --- ①-b ファイル選択ボタンによる画像アップロード ---
    imageLoader.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // --- ファイル処理の共通関数 ---
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください。');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            originalImage = new Image();
            originalImage.onload = () => {
                drawImageToCanvas(originalImage, originalCanvas, originalCtx);
                // プレビュー表示されたら変換後キャンバスはクリアする
                pixelatedCtx.clearRect(0, 0, pixelatedCanvas.width, pixelatedCanvas.height);
                downloadBtn.disabled = true;
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // --- ③ 変換開始ボタンの機能 ---
    convertBtn.addEventListener('click', () => {
        if (!originalImage) {
            alert('先に画像をアップロードしてください。');
            return;
        }
        pixelate();
    });

    // --- ドット絵に変換する処理 ---
    function pixelate() {
        const pixelWidth = parseInt(pixelWidthInput.value);
        const pixelHeight = parseInt(pixelHeightInput.value);

        if (isNaN(pixelWidth) || isNaN(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) {
            alert('有効な縦横ピクセル数を入力してください。');
            return;
        }

        // 変換後キャンバスのサイズを変換前と同じに設定
        pixelatedCanvas.width = originalCanvas.width;
        pixelatedCanvas.height = originalCanvas.height;

        // ドット絵風にするための設定（アンチエイリアスを無効化）
        pixelatedCtx.imageSmoothingEnabled = false;

        // 1. 指定されたピクセル数で、一旦小さく画像を描画
        pixelatedCtx.drawImage(originalImage, 0, 0, pixelWidth, pixelHeight);

        // 2. 小さく描画した画像を、元のキャンバスサイズに引き伸ばして描画
        pixelatedCtx.drawImage(
            pixelatedCanvas,
            0, 0, pixelWidth, pixelHeight,
            0, 0, pixelatedCanvas.width, pixelatedCanvas.height
        );

        downloadBtn.disabled = false;
    }

    // --- ④ ダウンロード機能 ---
    downloadBtn.addEventListener('click', () => {
        const format = downloadFormatSelect.value;
        const extension = format.split('/')[1];
        const link = document.createElement('a');
        link.href = pixelatedCanvas.toDataURL(format, 1.0); // JPEGの場合の品質を1.0に指定
        link.download = `pixel-art.${extension}`;
        link.click();
    });

    // --- ヘルパー関数：画像をキャンバスに描画 ---
    function drawImageToCanvas(image, canvas, context) {
        const parentWidth = canvas.parentElement.clientWidth;
        const maxWidth = parentWidth > 350 ? 350 : parentWidth; // PCとスマホで最大幅を調整

        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        context.clearRect(0, 0, width, height); // 描画前にクリア
        context.drawImage(image, 0, 0, width, height);
    }
});