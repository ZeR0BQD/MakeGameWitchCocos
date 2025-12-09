import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MoveToTarget')
export class CameraFollow extends Component {
    private tempPos: Vec3 = new Vec3()
    @property(Node) target: Node = null;
    @property protected offset: number = 0.05;
    start() {

    }

    update(deltaTime: number) {
        if (this.target) {
            Vec3.lerp(this.tempPos, this.node.getPosition(), this.target.getPosition(), this.offset);
            this.node.setPosition(this.tempPos);
        }
    }
}


