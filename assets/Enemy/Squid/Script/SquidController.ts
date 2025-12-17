import { _decorator, CCInteger, Vec2 } from 'cc';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';
import { ObjectPoolling } from 'db://assets/Core/ObjectPoolling';
import { SquidStateMachine } from './SquidStateMachine';

const { ccclass, property } = _decorator;

@ccclass('SquidController')
export class SquidController extends IDamageable {
    @property protected maxHealth: number = 10;
    @property protected expReward: number = 50;
    @property({ type: CCInteger }) public speed: number = 8;
    @property({ type: CCInteger }) public attackRange: number = 175;
    @property({ type: CCInteger }) public damage: number = 25;

    protected currentHealth: number;
    private _pool: ObjectPoolling;
    private _stateMachine: SquidStateMachine;

    start() {
        this.currentHealth = this.maxHealth;
        this._stateMachine = this.getComponent(SquidStateMachine);
    }

    public init(poolInstance: ObjectPoolling): void {
        this._pool = poolInstance;
        this.currentHealth = this.maxHealth;
        this.reset();
    }

    private reset(): void {
        this.currentHealth = this.maxHealth;

        if (this._stateMachine) {
            if (this._stateMachine.rigidBody) {
                this._stateMachine.rigidBody.linearVelocity = Vec2.ZERO;
            }
            this._stateMachine.changeState(this._stateMachine.moveState);
        }
    }

    public takeDamage(amount: number): void {
        this.currentHealth -= amount;

        if (!this.isAlive()) {
            this.die();
        }
    }

    public getCurrentHealth(): number {
        return this.currentHealth;
    }

    public isAlive(): boolean {
        return this.currentHealth > 0;
    }

    protected die(): void {
        const player = PlayerController._instance;
        if (player) {
            player.addExpReward(this.expReward);
        }

        if (this._pool) {
            this.scheduleOnce(() => {
                this._pool.returnObject(this.node);
            }, 0);
        }
    }
}