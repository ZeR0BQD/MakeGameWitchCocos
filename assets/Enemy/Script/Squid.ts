import { _decorator, CCInteger, Component, Node, Vec3, Vec2, RigidBody2D, ERigidBody2DType } from 'cc';
import { ObjectPoolling } from '../../Core/ObjectPoolling';
import { Movement } from '../../Player/Script/Player/Movement';
const { ccclass, property } = _decorator;

@ccclass('Squid')
export class Squid extends Component {

    @property({ type: CCInteger }) public speed: number = 10;

    protected target: Node = null;
    protected _pool: ObjectPoolling;
    private _rigidBody: RigidBody2D = null;

    start() {
        this.target = Movement.instance.node;
        this._rigidBody = this.getComponent(RigidBody2D);

        if (this._rigidBody) {
            // Set type thành Kinematic để Enemy KHÔNG đẩy Player
            this._rigidBody.type = ERigidBody2DType.Kinematic;
            this._rigidBody.fixedRotation = true;
        }
    }

    update(deltaTime: number) {
        if (!this.target || !this._rigidBody) return;
        this.moveToTarget(this.target, this.speed);
    }

    protected moveToTarget(target: Node, speed: number): void {
        const direction = new Vec3();
        Vec3.subtract(direction, target.position, this.node.position);
        direction.normalize();
        const velocity = new Vec2(
            direction.x * speed,
            direction.y * speed
        );
        this._rigidBody.linearVelocity = velocity;
    }

    public init(poolInstance: ObjectPoolling) {
        this._pool = poolInstance;
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }
    }

    protected onDestroy(): void {
        if (this._pool) {
            this._pool.returnObject(this.node);
        }
    }
}
