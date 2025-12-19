import { Vec3, Vec2, director } from 'cc';
import { ISquidState } from './ISquidState';
import { SquidStateMachine } from '../SquidStateMachine';
export class SquidPatrolState implements ISquidState {
    protected _distancePatrol: number = 300;
    protected _distanceChangeMove = 500;  // Vùng phát hiện và bắt đầu đuổi theo player
    protected _patrolTarget: Vec3 | null = null;
    protected _spawnPosition: Vec3 | null = null;
    protected _minDistanceToTarget = 30; // Khoảng cách tối thiểu để coi như đã đến target
    protected _waitTimeAtTarget = 3.0; // Thời gian chờ tại điểm đích
    protected _currentWaitTime = 0; // Thời gian đã chờ hiện tại
    protected _isWaiting = false; // Đang chờ tại điểm đích

    enter(squid: SquidStateMachine): void {
        // Lưu vị trí spawn nếu chưa có
        if (!this._spawnPosition) {
            this._spawnPosition = squid.node.position.clone();
        }
        // Reset trạng thái chờ
        this._isWaiting = false;
        this._currentWaitTime = 0;
        // Tạo patrol target mới khi vào state
        this._generateNewPatrolTarget(squid);
    }

    execute(squid: SquidStateMachine, deltaTime: number): void {
        if (!squid) return;

        const distanceToPlayer = Vec3.distance(squid.node.position, squid.target.position);

        // Nếu player đến gần, chuyển sang move state để đuổi theo
        if (distanceToPlayer < this._distanceChangeMove) {
            squid.changeState(squid.moveState);
            return;
        }

        // Kiểm tra nếu đã đến gần patrol target
        if (this._patrolTarget) {
            const distanceToPatrolTarget = Vec3.distance(squid.node.position, this._patrolTarget);

            if (distanceToPatrolTarget < this._minDistanceToTarget) {
                // Bắt đầu chờ tại điểm đích
                if (!this._isWaiting) {
                    this._isWaiting = true;
                    this._currentWaitTime = 0;
                    squid.rigidBody.linearVelocity = Vec2.ZERO;
                }

                // Đếm thời gian chờ
                this._currentWaitTime += deltaTime;
                if (this._currentWaitTime >= this._waitTimeAtTarget) {
                    this._isWaiting = false;
                    this._currentWaitTime = 0;
                    this._generateNewPatrolTarget(squid);
                }
            } else if (!this._isWaiting) {
                // Di chuyển về phía patrol target
                const direction = Vec3.subtract(new Vec3(), this._patrolTarget, squid.node.position);
                direction.normalize();
                squid.rigidBody.linearVelocity = new Vec2(direction.x * squid.speed * 0.5, direction.y * squid.speed * 0.5); // Patrol chậm hơn một nửa
            }
        }
    }

    exit(squid: SquidStateMachine): void {
        // Reset trạng thái chờ khi thoát khỏi patrol state
        this._isWaiting = false;
        this._currentWaitTime = 0;
    }

    // Hàm tạo patrol target mới quanh vị trí spawn
    protected _generateNewPatrolTarget(squid: SquidStateMachine): void {
        if (!this._spawnPosition) {
            this._spawnPosition = squid.node.position.clone();
        }

        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * this._distancePatrol;

        // Tạo patrol target TƯƠNG ĐỐI với spawn position
        this._patrolTarget = new Vec3(
            this._spawnPosition.x + radius * Math.cos(angle),
            this._spawnPosition.y + radius * Math.sin(angle),
            0
        );
    }
}