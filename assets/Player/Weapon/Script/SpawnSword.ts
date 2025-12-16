import { _decorator, CCInteger, math, Node, Vec3 } from 'cc';
import { SpwanOnCircle } from 'db://assets/Core/SpwanOnCircle';
import { SwordCotroller } from './SwordCotroller';

const { ccclass, property } = _decorator;


@ccclass('SpawnSword')
export class SpawnSword extends SpwanOnCircle {
    @property({ type: CCInteger }) public numberOfSwords: number = 3;
    @property public distanceSpawn: number = 100;
    @property protected _timeSpawn: number = 0;

    private _activeSwords: Node[] = [];
    private _lastSwordCount: number = 0;

    protected getDistanceSpawn(): number {
        return this.distanceSpawn;
    }

    protected getTimeSpawnRoot(): number {
        return this._timeSpawn;
    }

    onLoad() {
        super.onLoad();
        this._lastSwordCount = this.numberOfSwords;
    }

    start(): void {
        this.spawnInitialSwords();
    }

    update(deltaTime: number): void {
        if (this.numberOfSwords !== this._lastSwordCount) {
            this.adjustSwordCount();
            this._lastSwordCount = this.numberOfSwords;
        }
    }

    private spawnInitialSwords(): void {
        for (let i = 0; i < this.numberOfSwords; i++) {
            const sword = this._pool.getObject();
            if (sword) {
                const angle = (2 * Math.PI / this.numberOfSwords) * i;
                const targetPos = this.target.getPosition();

                const x = this.distanceSpawn * Math.cos(angle) + targetPos.x;
                const y = this.distanceSpawn * Math.sin(angle) + targetPos.y;
                sword.setPosition(x, y, 0);

                this._activeSwords.push(sword);
            }
        }
    }

    private adjustSwordCount(): void {
        const currentCount = this._activeSwords.length;
        const targetCount = this.numberOfSwords;

        if (currentCount < targetCount) {
            this.spawnAdditionalSwords(targetCount - currentCount);
        } else if (currentCount > targetCount) {
            this.removeExcessSwords(currentCount - targetCount);
        }

        this.redistributeSwords();
    }

    private spawnAdditionalSwords(count: number): void {
        for (let i = 0; i < count; i++) {
            const sword = this._pool.getObject();
            if (sword) {
                this._activeSwords.push(sword);
            }
        }
    }

    private removeExcessSwords(count: number): void {
        for (let i = 0; i < count; i++) {
            const sword = this._activeSwords.pop();
            if (sword) {
                this._pool.returnObject(sword);
            }
        }
    }

    private redistributeSwords(): void {
        const targetPos = this.target.getPosition();

        for (let i = 0; i < this._activeSwords.length; i++) {
            const angle = (2 * Math.PI / this.numberOfSwords) * i;
            const x = this.distanceSpawn * Math.cos(angle) + targetPos.x;
            const y = this.distanceSpawn * Math.sin(angle) + targetPos.y;
            this._activeSwords[i].setPosition(x, y, 0);

            const controller = this._activeSwords[i].getComponent(SwordCotroller);
            if (controller) {
                controller.recalculateAngle();
            }
        }
    }
}
