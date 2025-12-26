import { _decorator, Component, Input, input, Vec3, KeyCode, Node, RigidBody2D, Vec2 } from 'cc';
import { PlayerController } from './PlayerController';
import { joystickEvents } from '../../../UI/JoyStick/scripts/Joystick';

const { ccclass, property } = _decorator;

@ccclass('Movement')
export class Movement extends Component {
    public static _instance: Movement;

    @property protected _speed: number;

    private _rigidBody: RigidBody2D = null;
    private _moveDirection: Vec3 = new Vec3();  // Hướng di chuyển chung (keyboard + joystick)
    private _joystick: any = null;

    // Public getter để các component khác (như LambAnim) có thể đọc
    public get DirecMove(): Vec3 {
        return this._moveDirection;
    }

    protected onLoad(): void {
        // Singleton
        if (!Movement._instance) {
            Movement._instance = this;
        } else {
            this.destroy();
            return;
        }

        // Setup RigidBody
        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            this._rigidBody.fixedRotation = true;
        }

        // Tìm Joystick trong scene
        this.scheduleOnce(() => {
            const joystickNode = this.node.scene.getChildByPath("Canvas/UI/JoyStick");
            if (joystickNode) {
                this._joystick = joystickNode.getComponent("Joystick");
            } else {
                console.warn("[Movement] Joystick node not found!");
            }
        }, 0.1);

        // Keyboard events
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);

        // Joystick events
        joystickEvents.on("joystick-move", this._onJoystickMove, this);
    }

    start() {
        // Lấy speed từ PlayerController
        if (PlayerController._instance && PlayerController._instance._keyToVariable) {
            const speedKey = PlayerController._instance._keyToVariable["speed"];
            if (speedKey) {
                this._speed = PlayerController._instance[speedKey];
            }
        }

        // Fallback nếu không có PlayerController
        if (!this._speed || this._speed === 0) {
            this._speed = 100;
        }
    }

    protected onDestroy(): void {
        // Cleanup keyboard events
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);

        // Cleanup joystick events
        joystickEvents.off("joystick-move", this._onJoystickMove, this);
    }

    update(deltaTime: number) {
        if (!this._moveDirection) return;

        if (this._rigidBody) {
            // Check nếu đang di chuyển (threshold nhỏ để tránh floating point errors)
            const isMoving = Math.abs(this._moveDirection.x) > 0.01 || Math.abs(this._moveDirection.y) > 0.01;

            if (isMoving) {
                // Di chuyển bằng RigidBody2D
                const velocity = new Vec2(
                    this._moveDirection.x * this._speed,
                    this._moveDirection.y * this._speed
                );
                this._rigidBody.linearVelocity = velocity;

                // Flip sprite theo hướng
                if (this._moveDirection.x < -0.1) {
                    this.node.setScale(new Vec3(-1, 1, 1));
                } else if (this._moveDirection.x > 0.1) {
                    this.node.setScale(new Vec3(1, 1, 1));
                }
            } else {
                this._rigidBody.linearVelocity = Vec2.ZERO;
            }
        }
    }

    private _onJoystickMove(direction: Vec3) {
        this._moveDirection.x = direction.x;
        this._moveDirection.y = direction.y;
    }

    /**
     * Xử lý keyboard down
     */
    private _onKeyDown(event: any) {
        const prevDir = this._moveDirection.clone();

        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveDirection.x = -1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveDirection.x = 1;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveDirection.y = 1;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveDirection.y = -1;
                break;
        }

        this._updateJoystickVisual();
    }

    /**
     * Xử lý keyboard up
     */
    private _onKeyUp(event: any) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveDirection.x = 0;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveDirection.x = 0;
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveDirection.y = 0;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveDirection.y = 0;
                break;
        }

        this._updateJoystickVisual();
    }

    /**
     * Update joystick dot position để sync với keyboard
     */
    private _updateJoystickVisual() {
        if (this._joystick && this._joystick.setDirection) {
            this._joystick.setDirection(this._moveDirection);
        }
    }
}