import { _decorator, CCInteger, Node } from 'cc';
import { SpawnAroundPlayer } from 'db://assets/Player/Skills/Script/SpawnAroundPlayer';
import { SwordCotroller } from './SwordCotroller';

const { ccclass, property } = _decorator;

@ccclass('SpawnSword')
export class SpawnSword extends SpawnAroundPlayer {
    @property({ type: CCInteger, override: true }) public numberOfObjects: number = 3;
    @property({ override: true }) public distanceSpawn: number = 100;

    start() {
        super.start();
        this.activate();
    }

    protected onSpawned(sword: Node, angle: number, isRedistribute: boolean): void {
        if (!isRedistribute) return;

        const controller = sword.getComponent(SwordCotroller);
        if (controller) {
            controller.recalculateAngle();
        }
    }
}
