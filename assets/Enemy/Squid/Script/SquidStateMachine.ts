import { _decorator, Component, Node, Vec2, RigidBody2D } from 'cc';
import { PlayerController } from '../../../Player/Script/Core/PlayerController';
import { ISquidState } from './States/ISquidState';
import { SquidMoveState } from './States/SquidMoveState';
import { SquidAttackState } from './States/SquidAttackState';
import { SquidController } from './SquidController';
import { SquidPatrolState } from './States/SquidPatrolState';

const { ccclass, property } = _decorator;

@ccclass('SquidStateMachine')
export class SquidStateMachine extends Component {
    public target: Node = null;

    public get rigidBody(): RigidBody2D {
        return this._rigidBody;
    }
    private _rigidBody: RigidBody2D = null;
    private _controller: SquidController = null;

    public currentState: ISquidState = null;
    public moveState: SquidMoveState = new SquidMoveState();
    public attackState: SquidAttackState = new SquidAttackState();
    public patrolState: SquidPatrolState = new SquidPatrolState();

    public get speed(): number {
        return this._controller ? this._controller._speed : 0;
    }

    public get attackRange(): number {
        return this._controller ? this._controller._attackRange : 0;
    }

    public get patrolRange(): number {
        return this._controller ? this._controller._patrolRange : 0;
    }

    start() {
        this.target = PlayerController._instance.node;
        this._controller = this.getComponent(SquidController);

        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            this._rigidBody.fixedRotation = true;
        }

        this.changeState(this.patrolState);
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
}
