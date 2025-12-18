import { _decorator, CCFloat } from 'cc';
import { SpwanOnCircle } from '../../../Core/SpwanOnCircle';
import { SquidController } from './SquidController';

const { ccclass, property } = _decorator;

@ccclass('SpawnSquidOnCircle')
export class SpawnSquidOnCircle extends SpwanOnCircle {

    @property({ type: CCFloat, override: true }) protected _timeSpawn: number = 0.1;
    protected start(): void {
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
}
