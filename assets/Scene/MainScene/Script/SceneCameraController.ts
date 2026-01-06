import { _decorator, Component, director, Camera } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Quản lý cameras khi scene đang loading
 * Tắt cameras trong onLoad() và gửi list cho LoadNewScene overlay
 */
@ccclass('SceneCameraController')
export class SceneCameraController extends Component {

    protected onLoad(): void {
        const disabledCameras = this._disableAllCameras();
        director.emit('scene-cameras-disabled', disabledCameras);
        console.log('[SceneCameraController] Sent cameras list to LoadNewScene');
    }

    private _disableAllCameras(): Camera[] {
        const scene = director.getScene();
        if (!scene) return [];

        const disabledCameras: Camera[] = [];
        const allCameras = scene.getComponentsInChildren(Camera);

        console.log(`[SceneCameraController] Found ${allCameras.length} cameras`);

        for (const camera of allCameras) {
            if (camera.enabled) {
                camera.enabled = false;
                disabledCameras.push(camera);
            }
        }

        console.log(`[SceneCameraController] Disabled ${disabledCameras.length} cameras`);
        return disabledCameras;
    }
}
