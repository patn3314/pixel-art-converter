// --- DOM要素の取得 ---
// HTMLの各部品をJavaScriptで操作するために取得します。
const imageLoader = document.getElementById('imageLoader');
const pixelSizeSelect = document.getElementById('pixelSize');
const convertBtn = document.getElementById('convertBtn');
const originalCanvas = document.getElementById('originalCanvas');
const pixelatedCanvas = document.getElementById('pixelatedCanvas');
const downloadFormatSelect = document.getElementById('downloadFormat');
const downloadBtn = document.getElementById('downloadBtn');

const originalCtx = originalCanvas.getContext('2d');
const pixelatedCtx = pixelatedCanvas.getContext('2d');

let originalImage = null; // アップロードされた画像を保持する変数

// --- ① 画像アップロード機能 ---
// ファイルが選択されたときに実行されます。
imageLoader.addEventListener('change', e => {
    const reader = new FileReader();
    reader.onload = event => {
        originalImage = new Image();
        originalImage.onload = () => {
            // 元の画像を左側のキャンバスに描画
            drawImageToCanvas(originalImage, originalCanvas, originalCtx);
        };
        originalImage.src = event.target.result;
    };
    // ファイルを読み込む
    if (e.target.files[0]) {
        reader.readAsDataURL(e.target.files[0]);
    }
});

// --- ③ 変換開始ボタンの機能 ---
// ボタンがクリックされたときに実行されます。
convertBtn.addEventListener('click', () => {
    if (!originalImage) {
        alert('先に画像をアップロードしてください。');
        return;
    }
    pixelate();
});

// --- ドット絵に変換する処理 ---
function pixelate() {
    // 選択されたドット数を取得
    const pixelSize = parseInt(pixelSizeSelect.value);

    // 画像のアスペクト比を計算
    const aspectRatio = originalImage.width / originalImage.height;
    
    // ドット絵のサイズを計算
    let pixelatedWidth = pixelSize;
    let pixelatedHeight = pixelSize / aspectRatio;
    if (originalImage.height > originalImage.width) {
        pixelatedWidth = pixelSize * aspectRatio;
        pixelatedHeight = pixelSize;
    }

    // 小さなサイズで一度描画することでドット絵の効果を出す
    pixelatedCtx.imageSmoothingEnabled = false; // これがドット絵風にするための重要設定！

    // 1. 一旦、非常に小さいサイズで画像を描画
    pixelatedCtx.drawImage(originalImage, 0, 0, pixelatedWidth, pixelatedHeight);

    // 2. 小さく描画した画像を、元のキャンバスサイズに引き伸ばして描画
    pixelatedCtx.drawImage(
        pixelatedCanvas,
        0, 0, pixelatedWidth, pixelatedHeight, // ソース（小さく描画した領域）
        0, 0, pixelatedCanvas.width, pixelatedCanvas.height // 描画先（キャンバス全体に引き伸ばす）
    );

    // ダウンロードボタンを有効にする
    downloadBtn.disabled = false;
}

// --- ④ ダウンロード機能 ---
// ダウンロードボタンがクリックされたときに実行されます。
downloadBtn.addEventListener('click', () => {
    const format = downloadFormatSelect.value;
    const extension = format.split('/')[1]; // "image/png" -> "png"
    const link = document.createElement('a');
    
    // 変換後のキャンバスの内容をデータURLとして取得
    link.href = pixelatedCanvas.toDataURL(format);
    link.download = `pixel-art.${extension}`;
    link.click();
});

// --- ヘルパー関数：画像をキャンバスに描画 ---
// 画像を適切なサイズでキャンバスに描画するための共通処理
function drawImageToCanvas(image, canvas, context) {
    const maxWidth = 350; // キャンバスの最大幅
    let width = image.width;
    let height = image.height;

    // 画像が最大幅より大きい場合はリサイズ
    if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
    }
    
    canvas.width = width;
    canvas.height = height;

    context.drawImage(image, 0, 0, width, height);
    
    // 変換後キャンバスのサイズも同じに設定
    pixelatedCanvas.width = width;
    pixelatedCanvas.height = height;
}