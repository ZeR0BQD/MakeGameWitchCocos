import { _decorator, Camera, CCFloat, view } from 'cc';
import { SpwanOnCircle } from 'db://assets/Core/SpwanOnCircle';
import { SquidController } from './SquidController';
import { CameraManager } from 'db://assets/Core/CameraManager';
const { ccclass, property } = _decorator;

@ccclass('SpawnSquidOnCircle')
export class SpawnSquidOnCircle extends SpwanOnCircle {
    @property protected camera: Camera;

    @property({ type: CCFloat, override: true }) protected timeSpawn: number = 3;

    protected start(): void {
        this.initializeWithCamera();
    }

    /**
     * Khởi tạo camera và tính distanceSpawn
     * Nếu camera chưa sẵn sàng, sẽ tự động gọi lại sau 0.1 giây
     */
    private initializeWithCamera(): void {
        if (!CameraManager._instance || !CameraManager._instance.cameraGame) {
            this.scheduleOnce(() => {
                this.initializeWithCamera();
            }, 0.1);
            return;
        }

        this.camera = CameraManager._instance.cameraGame;
        this.distanceSpawn = this.getDistanceSpawn();
    }

    update(deltaTime: number) {
        this.getSpawnObjectWithTime(deltaTime);
    }

    protected spwanObjectOnCircle(): void {
        const spawn = this._pool.getObject();
        if (spawn) {
            spawn.setPosition(this.getPointOnCircle(this.target.getPosition(), this.distanceSpawn));

            const controller = spawn.getComponent(SquidController);
            if (controller) {
                controller.init(this._pool);
            }
        }
    }

    protected getDistanceSpawn(): number {
        if (!this.camera || this.camera.projection !== Camera.ProjectionType.ORTHO) {
            return 500;
        }

        const cameraSize = CameraManager._instance.getCameraSize(this.camera);
        const maxDimension = Math.max(cameraSize.width, cameraSize.height);
        return maxDimension / 2;
    }
}
