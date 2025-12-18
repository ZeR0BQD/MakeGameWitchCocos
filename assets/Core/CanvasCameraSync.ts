import { _decorator, Component, Canvas, Camera, UITransform } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Script tự động sync Canvas UITransform với Camera Ortho Height
 * Khi Camera zoom in/out (thay đổi orthoHeight), Canvas sẽ tự động scale theo
 */
@ccclass('CanvasCameraSync')
export class CanvasCameraSync extends Component {
    @property({
        type: Camera,
        tooltip: 'Camera chính của game'
    })
    mainCamera: Camera = null!;

    @property({
        tooltip: 'Ortho Height mặc định của camera (giá trị ban đầu)'
    })
    defaultOrthoHeight: number = 480;

    @property({
        tooltip: 'Bật/tắt auto sync'
    })
    enableSync: boolean = true;

    private _canvasTransform: UITransform = null!;
    private _defaultCanvasWidth: number = 1280;
    private _defaultCanvasHeight: number = 720;
    private _lastZoomRatio: number = 1.0;

    onLoad() {
        console.log('[CanvasCameraSync] onLoad');

        // Tự động tìm Camera nếu chưa assign
        if (!this.mainCamera) {
            this.mainCamera = this.node.getComponentInChildren(Camera);
            if (!this.mainCamera) {
                console.error('[CanvasCameraSync] Không tìm thấy Camera! Hãy assign trong Inspector.');
                return;
            }
        }

        // Lấy UITransform của Canvas node
        this._canvasTransform = this.node.getComponent(UITransform);
        if (!this._canvasTransform) {
            console.error('[CanvasCameraSync] Canvas node phải có UITransform component!');
            return;
        }

        // Lưu giá trị mặc định từ UITransform hiện tại
        this._defaultCanvasWidth = this._canvasTransform.width;
        this._defaultCanvasHeight = this._canvasTransform.height;
        console.log('[CanvasCameraSync] Default Canvas Size:', this._defaultCanvasWidth, 'x', this._defaultCanvasHeight);

        // Auto-detect defaultOrthoHeight từ camera nếu đang dùng giá trị default
        if (this.defaultOrthoHeight === 480 && this.mainCamera) {
            this.defaultOrthoHeight = this.mainCamera.orthoHeight;
            console.log('[CanvasCameraSync] Auto-detected defaultOrthoHeight:', this.defaultOrthoHeight);
        }
    }

    start() {
        // Sync lần đầu khi start
        this.syncCanvasWithCamera();
    }

    update(deltaTime: number) {
        if (!this.enableSync) return;

        // Sync mỗi frame để đảm bảo luôn cập nhật theo camera
        this.syncCanvasWithCamera();
    }

    /**
     * Đồng bộ Canvas UITransform với Camera Ortho Height
     */
    private syncCanvasWithCamera() {
        if (!this.mainCamera || !this._canvasTransform) return;

        // Tính tỷ lệ zoom của camera
        const zoomRatio = this.mainCamera.orthoHeight / this.defaultOrthoHeight;

        // Chỉ cập nhật nếu có thay đổi đáng kể (tránh trigger liên tục)
        if (Math.abs(zoomRatio - this._lastZoomRatio) < 0.001) return;

        this._lastZoomRatio = zoomRatio;

        // Tính kích thước canvas mới
        const newWidth = Math.round(this._defaultCanvasWidth * zoomRatio);
        const newHeight = Math.round(this._defaultCanvasHeight * zoomRatio);

        // Cập nhật UITransform content size
        this._canvasTransform.setContentSize(newWidth, newHeight);

        console.log('[CanvasCameraSync] Canvas scaled:', newWidth, 'x', newHeight, '| Zoom:', zoomRatio.toFixed(2) + 'x');
    }

    /**
     * Reset về giá trị mặc định
     */
    public resetToDefault() {
        if (!this._canvasTransform) return;

        this._canvasTransform.setContentSize(
            this._defaultCanvasWidth,
            this._defaultCanvasHeight
        );

        this._lastZoomRatio = 1.0;
        console.log('[CanvasCameraSync] Reset to default size');
    }

    /**
     * Lấy tỷ lệ zoom hiện tại
     */
    public getCurrentZoomRatio(): number {
        if (!this.mainCamera) return 1.0;
        return this.mainCamera.orthoHeight / this.defaultOrthoHeight;
    }
}
