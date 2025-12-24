import { _decorator, CCInteger, Node, Vec3 } from 'cc';
import { SpwanOnCircle } from 'db://assets/Core/SpwanOnCircle';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';

const { ccclass, property } = _decorator;
@ccclass('SpawnAroundPlayer')
export abstract class SpawnAroundPlayer extends SpwanOnCircle {
    @property({ type: CCInteger }) public numberOfObjects: number = 3;
    @property public distanceSpawn: number = 100;
    @property({ override: true }) protected _timeSpawn: number = 0;
    @property({ type: Node, override: true }) protected target: Node;

    // Tracking spawned objects
    protected _activeObjects: Node[] = [];
    protected _lastCount: number = 0;

    protected getDistanceSpawn(): number {
        return this.distanceSpawn;
    }

    protected getTimeSpawnRoot(): number {
        return this._timeSpawn;
    }

    onLoad() {
        super.onLoad();
    }

    start(): void {
        this.target = PlayerController._instance.node;
        this._lastCount = this.numberOfObjects;
    }

    update(deltaTime: number): void {
        if (this.numberOfObjects !== this._lastCount) {
            this.updateCount();
            this._lastCount = this.numberOfObjects;
        }
    }
    public activate(): void {
        this.initSpawn();
    }

    protected initSpawn(): void {
        for (let i = 0; i < this.numberOfObjects; i++) {
            const obj = this._pool.getObject();
            if (obj) {
                const angle = (2 * Math.PI / this.numberOfObjects) * i;
                const targetPos = this.target.getPosition();

                const x = this.distanceSpawn * Math.cos(angle) + targetPos.x;
                const y = this.distanceSpawn * Math.sin(angle) + targetPos.y;
                obj.setPosition(x, y, 0);

                this._activeObjects.push(obj);
                this.onSpawned(obj, angle, false);
            }
        }
    }

    protected updateCount(): void {
        const currentCount = this._activeObjects.length;
        const targetCount = this.numberOfObjects;

        if (currentCount < targetCount) {
            this.addObjects(targetCount - currentCount);
        } else if (currentCount > targetCount) {
            this.removeObjects(currentCount - targetCount);
        }

        this.redistributeCircle();
    }

    protected addObjects(count: number): void {
        for (let i = 0; i < count; i++) {
            const obj = this._pool.getObject();
            if (obj) {
                this._activeObjects.push(obj);
            }
        }
    }

    protected removeObjects(count: number): void {
        for (let i = 0; i < count; i++) {
            const obj = this._activeObjects.pop();
            if (obj) {
                this._pool.returnObject(obj);
            }
        }
    }

    protected redistributeCircle(): void {
        const targetPos = this.target.getPosition();

        for (let i = 0; i < this._activeObjects.length; i++) {
            const angle = (2 * Math.PI / this.numberOfObjects) * i;
            const x = this.distanceSpawn * Math.cos(angle) + targetPos.x;
            const y = this.distanceSpawn * Math.sin(angle) + targetPos.y;
            this._activeObjects[i].setPosition(x, y, 0);
            this.onSpawned(this._activeObjects[i], angle, true);
        }
    }

    protected abstract onSpawned(node: Node, angle: number, isRedistribute: boolean): void;
}
