import { _decorator, Component, EventKeyboard, Input, input, Vec3, KeyCode, view, SpriteRenderer, Node, RigidBody2D, Vec2 } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('Movement')
export class Movement extends Component {
    public static _instance: Movement = null;
    protected direcMove: Vec3 = new Vec3(0, 0, 0);
    public get DirecMove(): Vec3 {
        return this.direcMove;
    }

    @property protected _speed: number;

    private _rigidBody: RigidBody2D = null;

    protected onLoad(): void {
        if (Movement._instance != null) {
            this.destroy();
            return;
        }

        Movement._instance = this;

        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            this._rigidBody.fixedRotation = true;
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        this._speed = PlayerController._instance[PlayerController._instance._keyToVariable["speed"]];
    }

    update(deltaTime: number) {
        if (this._rigidBody) {
            const velocity = new Vec2(
                this.direcMove.x * this._speed,
                this.direcMove.y * this._speed
            );
            this._rigidBody.linearVelocity = velocity;
        }
    }


    onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.direcMove.x = -1;
                this.node.setScale(new Vec3(-1, 1, 1));
                break;
            case KeyCode.KEY_D:
                this.direcMove.x = 1;
                this.node.setScale(new Vec3(1, 1, 1));
                break;
            case KeyCode.KEY_W:
                this.direcMove.y = 1;
                break;
            case KeyCode.KEY_S:
                this.direcMove.y = -1;
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.direcMove.x = 0;
                break;
            case KeyCode.KEY_D:
                this.direcMove.x = 0;
                break;
            case KeyCode.KEY_W:
                this.direcMove.y = 0;
                break;
            case KeyCode.KEY_S:
                this.direcMove.y = 0;
                break;
        }
    }
}