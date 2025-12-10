import { _decorator, Component, instantiate, Node, Prefab, Vec3, view, CCInteger } from 'cc';
import { ObjectPoolling } from './ObjectPoolling';
const { ccclass, property } = _decorator;

@ccclass('SpwanOnCircle')
export class SpwanOnCircle extends Component {

    @property(Prefab) protected prefab: Prefab;
    @property(Node) protected target: Node;
    @property({ type: CCInteger }) protected poolSize: number = 10;
    @property protected timeSpawnRoot: number = 3;
    protected _timer: number = 0;
    protected distanceSpawn: number;
    protected _pool: ObjectPoolling;
    onLoad() {
        this.distanceSpawn = view.getVisibleSize().width / 2 + 100;

        if (!this.prefab) return;

        this._pool = this.node.getComponent(ObjectPoolling);
        if (!this._pool) {
            this._pool = this.node.addComponent(ObjectPoolling);
        }

        this._pool.poolSize = this.poolSize;
        this._pool.init(this.prefab);
        this._timer = this.timeSpawnRoot;
    }

    update(deltaTime: number) {
        this._timer -= deltaTime;
        if (this._timer <= 0) {
            this.spwanObject();
            this._timer = this.timeSpawnRoot;
        }
    }

    protected spwanObject(): void {
        const spawn = this._pool.getObject();
        if (spawn) {
            spawn.setPosition(this.getRandomPointOnCircle(this.target.getPosition(), this.distanceSpawn));
        }
    }

    protected getRandomPointOnCircle(root: Vec3, distance: number): Vec3 {
        const angle = Math.random() * 2 * Math.PI;
        const x = distance * Math.cos(angle) + root.x;
        const y = distance * Math.sin(angle) + root.y;
        return new Vec3(x, y, 0);
    }
}
