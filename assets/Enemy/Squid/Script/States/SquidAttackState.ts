import { Vec2, Vec3 } from 'cc';
import { ISquidState } from './ISquidState';
import { SquidStateMachine } from '../SquidStateMachine';

enum AttackPhase {
    PREPARE,
    WAITING,
    DASHING
}

export class SquidAttackState implements ISquidState {

    private _lastPosTarget: Vec3 = new Vec3();

    private _dashDistance: number = 120;

    private _waitTime: number = 1.0;

    private _timer: number = 0;

    private _currentPhase: AttackPhase = AttackPhase.PREPARE;

    private _dashSpeedMultiplier: number = 2;

    enter(squid: SquidStateMachine): void {
        this._currentPhase = AttackPhase.PREPARE;
        this._timer = 0;

        if (squid.rigidBody) {
            squid.rigidBody.linearVelocity = Vec2.ZERO;
        }
    }

    execute(squid: SquidStateMachine, deltaTime: number): void {
        if (!squid.target) return;

        const distance = Vec3.distance(squid.node.position, squid.target.position);

        const exitRange = squid.attackRange + 20;
        if (distance > exitRange && this._currentPhase !== AttackPhase.DASHING) {
            squid.changeState(squid.moveState);
            return;
        }


        switch (this._currentPhase) {
            case AttackPhase.PREPARE:
                this._prepareDash(squid);
                break;

            case AttackPhase.WAITING:
                this._waitBeforeDash(squid, deltaTime);
                break;

            case AttackPhase.DASHING:
                this._executeDash(squid);
                break;
        }
    }

    exit(squid: SquidStateMachine): void {
    }


    private _prepareDash(squid: SquidStateMachine): void {
        if (!squid.target || !squid.rigidBody) return;


        const direction = new Vec3();
        Vec3.subtract(direction, squid.target.position, squid.node.position);
        direction.normalize();


        Vec3.multiplyScalar(this._lastPosTarget, direction, this._dashDistance);
        Vec3.add(this._lastPosTarget, squid.target.position, this._lastPosTarget);


        squid.rigidBody.linearVelocity = Vec2.ZERO;
        this._currentPhase = AttackPhase.WAITING;
        this._timer = 0;
    }


    private _waitBeforeDash(squid: SquidStateMachine, deltaTime: number): void {
        this._timer += deltaTime;

        if (this._timer >= this._waitTime) {

            this._currentPhase = AttackPhase.DASHING;
        }
    }


    private _executeDash(squid: SquidStateMachine): void {
        if (!squid.rigidBody) return;


        const direction = new Vec3();
        Vec3.subtract(direction, this._lastPosTarget, squid.node.position);

        const distanceToTarget = direction.length();


        if (distanceToTarget < 10) {
            this._currentPhase = AttackPhase.PREPARE;
            squid.rigidBody.linearVelocity = Vec2.ZERO;
            return;
        }


        direction.normalize();
        const dashSpeed = squid.speed + this._dashSpeedMultiplier;

        const velocity = new Vec2(
            direction.x * dashSpeed,
            direction.y * dashSpeed
        );

        squid.rigidBody.linearVelocity = velocity;
    }
}
