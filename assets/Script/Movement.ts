import { _decorator, Component, EventKeyboard, Input, input, Vec3, KeyCode, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Movement')
export class Movement extends Component {

    protected DirecMove: Vec3 = new Vec3(0, 0, 0);
    @property protected speed: number = 200;

    protected onLoad(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {

    }

    update(deltaTime: number) {
        let moveDelta = new Vec3(this.DirecMove.x, this.DirecMove.y, 0).multiplyScalar(this.speed * deltaTime);
        if (moveDelta != Vec3.ZERO) moveDelta.normalize();
        console.log("Move Delta: ", moveDelta);
        this.node.translate(moveDelta);
    }

    onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.DirecMove.x = -1;
                break;
            case KeyCode.KEY_D:
                this.DirecMove.x = 1;
                break;
            case KeyCode.KEY_W:
                this.DirecMove.y = 1;
                break;
            case KeyCode.KEY_S:
                this.DirecMove.y = -1;
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.DirecMove.x = 0;
                break;
            case KeyCode.KEY_D:
                this.DirecMove.x = 0;
                break;
            case KeyCode.KEY_W:
                this.DirecMove.y = 0;
                break;
            case KeyCode.KEY_S:
                this.DirecMove.y = 0;
                break;
        }
    }
}