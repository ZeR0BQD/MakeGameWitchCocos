import { _decorator, Component, ProgressBar, Label, director, Camera } from 'cc';
import { SceneCameraController } from '../../MainScene/Script/SceneCameraController';
const { ccclass, property } = _decorator;

@ccclass('LoadNewScene')
export class LoadNewScene extends Component {
    @property(ProgressBar)
    progressBar: ProgressBar = null!;

    @property(Label)
    precenLoading: Label = null!;

    private readonly PRELOAD_WEIGHT: number = 0.8;
    private readonly MAP_WEIGHT: number = 0.2;
    private readonly ESTIMATED_MAP_LOAD_TIME: number = 3;

    private _sceneName: string = '';
    private _isMapLoading: boolean = false;
    private _mapLoadStartTime: number = 0;
    private _sceneCameras: Camera[] = [];

    public set _setSceneName(name: string) {
        this._sceneName = name;
    }

    protected start(): void {
        director.addPersistRootNode(this.node);
        director.on('scene-cameras-disabled', this._onSceneCamerasDisabled, this);
        this.load(this._sceneName);
        console.log("[LoadNewScene] Scene name:", this._sceneName);
    }

    protected update(dt: number): void {
        if (!this._isMapLoading) return;

        const elapsed = (Date.now() - this._mapLoadStartTime) / 1000;
        const ratio = Math.min(elapsed / this.ESTIMATED_MAP_LOAD_TIME, 1);
        const displayProgress = this.PRELOAD_WEIGHT + ratio * this.MAP_WEIGHT;

        this._updateProgress(displayProgress);
    }

    //excludeNames là tên của node không muốn tắt
    unactiveTopLevelNodes(excludeNames: string[] = []): void {
        const scene = director.getScene();
        if (!scene) {
            console.warn('[UnactiveNodes] Scene not found');
            return;
        }

        const topLevelNodes = scene.children;
        let unactivedCount = 0;

        for (let i = 0; i < topLevelNodes.length; i++) {
            const node = topLevelNodes[i];
            if (excludeNames.includes(node.name)) {
                continue;
            }

            node.active = false;
            unactivedCount++;
        }

        console.log(`[UnactiveNodes] Unactived ${unactivedCount} top-level nodes`);
    }

    public load(sceneName: string): void {
        this._sceneName = sceneName;
        // Tắt tất cả nodes trừ node LoadNewScene hiện tại
        this.unactiveTopLevelNodes([this.node.name]);
        this._startLoading();
    }

    private _startLoading(): void {
        director.pause();
        this._updateProgress(0);
        director.preloadScene(
            this._sceneName,
            this._onProgress.bind(this),
            this._onComplete.bind(this)
        );
    }

    private _onProgress(completedCount: number, totalCount: number): void {
        const actualProgress = completedCount / totalCount;

        // Fake progress: Chỉ hiển thị 80% cho preload phase
        const displayProgress = actualProgress * this.PRELOAD_WEIGHT;

        this._updateProgress(displayProgress);
    }

    private _onComplete(error?: Error): void {
        if (error) {
            console.error('Load scene failed:', error);
            return;
        }

        // Hiển thị 80% (không phải 100%)
        this._updateProgress(this.PRELOAD_WEIGHT);

        director.resume();
        director.loadScene(this._sceneName);

        // Bắt đầu fake smooth progress cho map loading phase
        this._isMapLoading = true;
        this._mapLoadStartTime = Date.now();

        // Lắng nghe event map-loaded
        director.once('map-loaded', this._onMapLoaded, this);

        console.log('[LoadNewScene] Map loading phase started...');
    }

    private _onMapLoaded(mapName: string): void {
        console.log(`[LoadNewScene] Map "${mapName}" loaded!`);

        // Stop fake smooth
        this._isMapLoading = false;

        // Force 100%
        this._updateProgress(1);

        // Bật lại tất cả cameras từ scene
        this._enableSceneCameras();
        // Remove khỏi persist list trước khi destroy
        director.removePersistRootNode(this.node);
        this.node.destroy();
    }

    private _onSceneCamerasDisabled(cameras: Camera[]): void {
        this._sceneCameras = cameras;
        console.log(`[LoadNewScene] Received ${cameras.length} cameras from scene`);
    }

    private _enableSceneCameras(): void {
        for (const camera of this._sceneCameras) {
            if (camera && camera.isValid) {
                camera.enabled = true;
            }
        }
        console.log(`[LoadNewScene] Enabled ${this._sceneCameras.length} cameras`);
        this._sceneCameras = [];
    }

    private _updateProgress(progress: number): void {
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
        if (this.precenLoading) {
            const percent = Math.floor(progress * 100);
            this.precenLoading.string = `${percent}%`;
        }
    }
}
