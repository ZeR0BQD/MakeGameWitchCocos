import { _decorator, Component, EventKeyboard, Input, input, Vec3, KeyCode, view, SpriteRenderer, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Movement')
export class Movement extends Component {
    public static instance: Movement;
    protected direcMove: Vec3 = new Vec3(0, 0, 0);
    public get DirecMove(): Vec3 {
        return this.direcMove;
    }
    @property protected speed: number = 200;

    protected onLoad(): void {
        if (!Movement.instance) {
            Movement.instance = this;
        } else {
            this.destroy();
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {

    }

    update(deltaTime: number) {
        let moveDelta = new Vec3(this.direcMove.x, this.direcMove.y, 0).multiplyScalar(this.speed * deltaTime);
        if (!moveDelta.equals(Vec3.ZERO)) moveDelta.normalize();
        this.node.translate(moveDelta);
    }


    onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
                this.direcMove.x = -1;
                console.log(view.getVisibleSize().width);
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