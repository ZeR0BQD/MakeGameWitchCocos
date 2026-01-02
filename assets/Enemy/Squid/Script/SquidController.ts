import { _decorator, CCFloat, Vec2 } from 'cc';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';
import { ObjectPoolling } from 'db://assets/Core/ObjectPoolling';
import { SquidStateMachine } from './SquidStateMachine';
import { UIManager } from 'db://assets/UI/Script/UIManager';

const { ccclass, property } = _decorator;

@ccclass('SquidController')
export class SquidController extends IDamageable {
    @property protected _maxHealth: number = 10;
    @property protected _expReward: number = 50;
    @property({ type: CCFloat }) public _speed: number = 8;
    @property({ type: CCFloat }) public _attackRange: number = 120;  // Vùng chuyển sang tấn công
    @property({ type: CCFloat }) public _patrolRange: number = 400;  // Vùng từ bỏ đuổi theo
    @property({ tooltip: 'Cho phép squid patrol khi ra ngoài patrol range' })
    public enablePatrol: boolean = false;
    @property({ type: CCFloat }) public _damage: number = 25;

    protected _currentHealth: number;
    private _pool: ObjectPoolling;
    private _stateMachine: SquidStateMachine;

    // Mapping giữa config key và tên biến thực tế cho IConfig
    public readonly _keyToVariable = {
        "maxHealth": "_maxHealth",
        "speed": "_speed",
        "attackRange": "_attackRange",
        "damage": "_damage",
        "expReward": "_expReward"
    };

    public readonly configPath = "enemy/squid/squidStats";

    start() {
        this._currentHealth = this._maxHealth;
        this._stateMachine = this.getComponent(SquidStateMachine);
    }

    public init(poolInstance: ObjectPoolling): void {
        this._pool = poolInstance;
        this._currentHealth = this._maxHealth;
        this.reset();
    }

    private reset(): void {
        this._currentHealth = this._maxHealth;

        if (this._stateMachine) {
            if (this._stateMachine.rigidBody) {
                this._stateMachine.rigidBody.linearVelocity = Vec2.ZERO;
            }
            const initialState = this.enablePatrol
                ? this._stateMachine.patrolState
                : this._stateMachine.moveState;
            this._stateMachine.changeState(initialState);
        }
    }

    public takeDamage(amount: number): void {
        this._currentHealth -= amount;

        if (!this.isAlive()) {
            this.die();
        }
    }

    public getCurrentHealth(): number {
        return this._currentHealth;
    }

    public isAlive(): boolean {
        return this._currentHealth > 0;
    }

    protected die(): void {
        const player = PlayerController._instance;
        if (player) {
            player.addExpReward(this._expReward);
        }

        const uiManager = UIManager.getInstance();
        if (uiManager && player) {
            uiManager.publish('enemyDie', {
                position: this.node.getPosition(),
                playerLevel: player.level
            });
        }

        if (this._pool) {
            this.scheduleOnce(() => {
                this._pool.returnObject(this.node);
            }, 0);
        }
    }
}