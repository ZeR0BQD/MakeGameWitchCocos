import { _decorator, CCInteger, Component, Node, Vec3, Vec2, RigidBody2D, ERigidBody2DType } from 'cc';
import { ObjectPoolling } from '../../Core/ObjectPoolling';
import { Movement } from '../../Player/Script/Core/Movement';
import { ISquidState } from './States/ISquidState';
import { SquidMoveState } from './States/SquidMoveState';
import { SquidAttackState } from './States/SquidAttackState';

const { ccclass, property } = _decorator;

@ccclass('SquidStateMachine')
export class SquidStateMachine extends Component {

    @property({ type: CCInteger })
    public speed: number = 8;

    @property({ type: CCInteger })
    public attackRange: number = 175;

    public target: Node = null;

    public get rigidBody(): RigidBody2D {
        return this._rigidBody;
    }
    private _rigidBody: RigidBody2D = null;

    protected _pool: ObjectPoolling;

    public currentState: ISquidState = null;
    public moveState: SquidMoveState = new SquidMoveState();
    public attackState: SquidAttackState = new SquidAttackState();

    start() {
        this.target = Movement.instance.node;

        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            this._rigidBody.fixedRotation = true;
        }

        this.changeState(this.moveState);
    }

    update(deltaTime: number) {
        if (this.currentState) {
            this.currentState.execute(this, deltaTime);
        }
    }

    public changeState(newState: ISquidState): void {
        if (this.currentState) {
            this.currentState.exit(this);
        }

        this.currentState = newState;
        this.currentState.enter(this);
    }

    public init(poolInstance: ObjectPoolling): void {
        this._pool = poolInstance;
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        this.changeState(this.moveState);
    }

    protected onDestroy(): void {
        if (this._pool) {
            this._pool.returnObject(this.node);
        }
    }
}
