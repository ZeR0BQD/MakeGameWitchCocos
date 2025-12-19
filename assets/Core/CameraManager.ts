import { _decorator, Component, Node, Camera, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraManager')
export class CameraManager extends Component {
    @property(Camera) public cameraGame: Camera;
    @property(Camera) public cameraUI: Camera;
    public static _instance: CameraManager;

    protected onLoad(): void {
        if (!CameraManager._instance) {
            CameraManager._instance = this;
        }
        else {
            this.destroy();
            return;
        }
    }


    public visibleHeight(camera: Camera): number {
        const aspect = view.getVisibleSize().width / view.getVisibleSize().height;
        const visibleHeight = camera.orthoHeight * 2 * aspect;
        return visibleHeight;
    }

    //Tính toán kích thước của camera viewport

    public getCameraSize(camera: Camera): { width: number, height: number } {
        if (camera && camera.projection === Camera.ProjectionType.ORTHO) {
            const aspect = view.getVisibleSize().width / view.getVisibleSize().height;
            const height = camera.orthoHeight * 2; // orthoHeight là bán kính, nhân 2 để lấy đường kính
            const width = height * aspect;

            return { width, height };
        } else {
            console.warn("[CameraManager]<getCameraSize> Camera không phải orthographic, trả về kích thước mặc định");
            return { width: 0, height: 0 };
        }
    }

}


