import { _decorator, Component, Camera } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Controller để điều khiển Camera orthoHeight
 * Dùng để zoom in/out camera trong runtime
 */
@ccclass('CameraController')
export class CameraController extends Component {
    @property({
        type: Camera,
        tooltip: 'Camera component cần điều khiển'
    })
    camera: Camera = null!;

    @property({
        tooltip: 'Ortho height mục tiêu khi game start (để zoom out camera)'
    })
    targetOrthoHeight: number = 600;

    @property({
        tooltip: 'Tự động set orthoHeight khi start game'
    })
    autoSetOnStart: boolean = true;

    @property({
        tooltip: 'Thời gian transition (giây) để zoom mượt mà. 0 = instant'
    })
    transitionDuration: number = 0;

    private _currentOrthoHeight: number = 480;
    private _isTransitioning: boolean = false;
    private _transitionProgress: number = 0;
    private _startOrthoHeight: number = 480;

    onLoad() {
        // Tự động tìm Camera nếu chưa assign
        if (!this.camera) {
            this.camera = this.getComponent(Camera);

            // Nếu vẫn không tìm thấy, tìm trong children
            if (!this.camera) {
                this.camera = this.getComponentInChildren(Camera);
            }
        }

        if (this.camera) {
            console.log('[CameraController] onLoad - Current orthoHeight:', this.camera.orthoHeight);
            this._currentOrthoHeight = this.camera.orthoHeight;

            // FORCE set ngay trong onLoad để override Scene default (360)
            if (this.autoSetOnStart) {
                console.log('[CameraController] Force setting orthoHeight to:', this.targetOrthoHeight);
                this.camera.orthoHeight = this.targetOrthoHeight;
                this._currentOrthoHeight = this.targetOrthoHeight;
            }
        }
    }

    start() {
        // Double check trong start để chắc chắn
        if (this.camera) {
            console.log('[CameraController] start - Current orthoHeight:', this.camera.orthoHeight);

            if (this.camera.orthoHeight !== this.targetOrthoHeight && this.autoSetOnStart) {
                console.warn('[CameraController] orthoHeight bị reset! Set lại...');
                this.setOrthoHeight(this.targetOrthoHeight, this.transitionDuration);
            }
        }
    }

    update(deltaTime: number) {
        if (!this._isTransitioning || !this.camera) return;

        this._transitionProgress += deltaTime / this.transitionDuration;

        if (this._transitionProgress >= 1.0) {
            // Hoàn thành transition
            this.camera.orthoHeight = this.targetOrthoHeight;
            this._currentOrthoHeight = this.targetOrthoHeight;
            this._isTransitioning = false;
            this._transitionProgress = 0;
        } else {
            // Lerp (linear interpolation) giữa start và target
            const newHeight = this.lerp(
                this._startOrthoHeight,
                this.targetOrthoHeight,
                this._transitionProgress
            );
            this.camera.orthoHeight = newHeight;
            this._currentOrthoHeight = newHeight;
        }
    }

    /**
     * Set camera ortho height với tùy chọn transition
     * @param height Ortho height mới
     * @param duration Thời gian transition (giây). 0 = instant
     */
    public setOrthoHeight(height: number, duration: number = 0) {
        if (!this.camera) return;

        this.targetOrthoHeight = height;

        if (duration <= 0) {
            // Instant change
            this.camera.orthoHeight = height;
            this._currentOrthoHeight = height;
            this._isTransitioning = false;
        } else {
            // Smooth transition
            this._startOrthoHeight = this._currentOrthoHeight;
            this.transitionDuration = duration;
            this._transitionProgress = 0;
            this._isTransitioning = true;
        }
    }

    /**
     * Zoom in (giảm orthoHeight)
     * @param amount Lượng giảm
     * @param duration Thời gian transition
     */
    public zoomIn(amount: number = 100, duration: number = 0.5) {
        const newHeight = Math.max(200, this._currentOrthoHeight - amount);
        this.setOrthoHeight(newHeight, duration);
    }

    /**
     * Zoom out (tăng orthoHeight)
     * @param amount Lượng tăng
     * @param duration Thời gian transition
     */
    public zoomOut(amount: number = 100, duration: number = 0.5) {
        const newHeight = Math.min(2000, this._currentOrthoHeight + amount);
        this.setOrthoHeight(newHeight, duration);
    }

    /**
     * Reset về orthoHeight mặc định
     */
    public resetZoom(duration: number = 0.5) {
        this.setOrthoHeight(480, duration);
    }

    /**
     * Lấy orthoHeight hiện tại
     */
    public getCurrentOrthoHeight(): number {
        return this._currentOrthoHeight;
    }

    /**
     * Linear interpolation helper
     */
    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }
}
