import { Vec3, Vec2 } from 'cc';
import { ISquidState } from './ISquidState';
import { SquidStateMachine } from '../SquidStateMachine';

export class SquidMoveState implements ISquidState {

    enter(squid: SquidStateMachine): void {
    }

    execute(squid: SquidStateMachine, deltaTime: number): void {
        if (!squid.target || !squid.rigidBody) return;

        const distance = Vec3.distance(squid.node.position, squid.target.position);

        if (distance < squid.attackRange) {
            squid.changeState(squid.attackState);
            return;
        }

        const direction = new Vec3();
        Vec3.subtract(direction, squid.target.position, squid.node.position);
        direction.normalize();

        const velocity = new Vec2(
            direction.x * squid.speed,
            direction.y * squid.speed
        );
        squid.rigidBody.linearVelocity = velocity;
    }

    exit(squid: SquidStateMachine): void {
    }
}
