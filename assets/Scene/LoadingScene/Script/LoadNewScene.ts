import { _decorator, Component, ProgressBar, Label, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadNewScene')
export class LoadNewScene extends Component {
    @property(ProgressBar)
    progressBar: ProgressBar = null!;

    @property(Label)
    percentLabel: Label = null!;

    private readonly PRELOAD_WEIGHT: number = 0.8;
    private readonly MAP_WEIGHT: number = 0.2;
    private readonly ESTIMATED_MAP_LOAD_TIME: number = 3;

    private _sceneName: string = '';
    private _isMapLoading: boolean = false;
    private _mapLoadStartTime: number = 0;

    public set _setSceneName(name: string) {
        this._sceneName = name;
    }

    protected start(): void {
        director.addPersistRootNode(this.node);
        if (this._sceneName) {
            this.load(this._sceneName);
            console.log("[LoadNewScene] Scene name:", this._sceneName);
        } else {
            console.warn("[LoadNewScene] No scene name set!");
        }
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
        director.loadScene(this._sceneName, () => {
            // Scene mới đã load xong
            // Tắt toàn bộ nodes trừ MapManager và LoadNewScene (đang persist)
            console.log('[LoadNewScene] New scene launched. Deactivating nodes...');
            this.unactiveTopLevelNodes(['MapManager', this.node.name]);

            // Bắt đầu fake smooth progress cho map loading phase
            this._isMapLoading = true;
            this._mapLoadStartTime = Date.now();
        });

        // Lắng nghe event map-loaded
        director.once('map-loaded', this._onMapLoaded, this);

        console.log('[LoadNewScene] Map loading phase started...');
    }

    // Bật lại toàn bộ node trong scene
    activeTopLevelNodes(excludeNames: string[] = []): void {
        const scene = director.getScene();
        if (!scene) return;

        const topLevelNodes = scene.children;
        for (let i = 0; i < topLevelNodes.length; i++) {
            const node = topLevelNodes[i];
            if (excludeNames.includes(node.name)) {
                continue;
            }
            node.active = true;
        }
        console.log(`[LoadNewScene] Reactivated all top-level nodes`);
    }

    private _onMapLoaded(mapName: string): void {
        console.log(`[LoadNewScene] Map "${mapName}" loaded!`);

        // Bật lại các node game (Player, UI, etc.)
        this.activeTopLevelNodes([this.node.name]); // Trừ loading node ra (dù ko quan trọng)

        // Stop fake smooth
        this._isMapLoading = false;

        // Force 100%
        this._updateProgress(1);
        // Remove khỏi persist list trước khi destroy
        director.removePersistRootNode(this.node);
        this.node.destroy();
    }

    private _updateProgress(progress: number): void {
        // console.log(`[LoadNewScene] Progress: ${progress.toFixed(2)}`);
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
        if (this.percentLabel) {
            const percent = Math.floor(progress * 100);
            this.percentLabel.string = `${percent}%`;
        } else {
            console.warn('[LoadNewScene] percentLabel is null! Check Editor assignment.');
        }
    }
}
