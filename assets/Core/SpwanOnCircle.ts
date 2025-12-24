import { _decorator, Component, instantiate, Node, Prefab, Vec3, view, CCInteger, CCFloat } from 'cc';
import { ObjectPoolling } from './ObjectPoolling';
const { ccclass, property } = _decorator;

@ccclass('SpwanOnCircle')
export class SpwanOnCircle extends Component {

    @property({ type: Prefab, override: true }) protected prefab: Prefab;
    @property({ type: Node, override: true }) protected target: Node;
    @property({ type: CCInteger }) protected _poolSize: number = 10;
    @property({ type: CCFloat, override: true }) protected _timeSpawn: number = 3.0;
    protected _timer: number = 0;
    protected distanceSpawn: number;
    protected _pool: ObjectPoolling;
    onLoad() {
        this.distanceSpawn = this.getDistanceSpawn();

        if (!this.prefab) return;

        this._pool = this.node.getComponent(ObjectPoolling);
        if (!this._pool) {
            this._pool = this.node.addComponent(ObjectPoolling);
        }

        this._pool.poolSize = this.getPoolSize();
        this._pool.init(this.prefab);
        this._timer = this.getTimeSpawnRoot();
    }

    protected getTimeSpawnRoot(): number {
        return this._timeSpawn;
    }

    protected setTimeSpawnRoot(time: number): void {
        this._timeSpawn = time;
    }

    protected getPoolSize(): number {
        return this._poolSize;
    }

    protected getDistanceSpawn(): number {
        return view.getVisibleSize().width / 2 + 100;
    }

    protected getSpawnObjectWithTime(deltaTime: number): void {
        this._timer -= deltaTime;
        if (this._timer <= 0) {
            this.spwanObjectOnCircle();
            this._timer = this._timeSpawn;
        }
    }

    protected spwanObjectOnCircle(): void {
        const spawn = this._pool.getObject();
        if (spawn) {
            spawn.setPosition(this.getPointOnCircle(this.target.getPosition(), this.distanceSpawn));
        }
    }

    protected getPointOnCircle(target: Vec3, distance: number): Vec3 {
        const angle = Math.random() * 2 * Math.PI;
        const x = distance * Math.cos(angle) + target.x;
        const y = distance * Math.sin(angle) + target.y;
        return new Vec3(x, y, 0);
    }
}
