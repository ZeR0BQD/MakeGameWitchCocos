import { _decorator, CCInteger, Component, Node, Vec3, warn } from 'cc';
import { ObjectPoolling } from '../../Core/ObjectPoolling';
import { Movement } from '../../Player/Script/Player/Movement';
const { ccclass, property } = _decorator;

@ccclass('Squid')
export class Squid extends Component {

    @property({ type: CCInteger })
    public speed: number = 100;
    protected target: Node = null;
    protected _pool: ObjectPoolling;

    start() {
        this.target = Movement.instance.node;
    }

    update(deltaTime: number) {
        this.node.setPosition(this.moveToTarget(this.target, this.speed, deltaTime));
    }

    public init(poolInstance: ObjectPoolling) {
        this._pool = poolInstance;
    }

    protected moveToTarget(target: Node, speed: number, deltaTime: number): Vec3 {
        if (!this.target) return;
        const _currentPos = new Vec3();
        Vec3.moveTowards(_currentPos, this.node.position, target.position, speed * deltaTime);
        return _currentPos;
    }

    protected onDestroy(): void {
        if (this._pool) {
            this._pool.returnObject(this.node);
        }
    }
}
