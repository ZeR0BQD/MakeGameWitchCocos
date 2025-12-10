import { _decorator, Component, Animation, Node } from 'cc';
import { Movement } from '../Core/Movement';
const { ccclass, property } = _decorator;

@ccclass('LambAnim')
export class LambAnim extends Component {
    protected currentAnim: string = '';
    protected move: Movement;
    protected animator: Animation;
    protected onLoad(): void {
        this.move = this.node.getComponent(Movement);
        this.animator = this.node.getComponent(Animation);
    }

    update(deltaTime: number) {
        this.moveAnim();
    }

    protected moveAnim() {
        let animName = '';

        //Idle
        if (this.move.DirecMove.x === 0) {
            animName = 'LambIdle';
        }

        //Run right and left
        if (this.move.DirecMove.x === 1 || this.move.DirecMove.x === -1) {
            animName = 'LambRunRight';
        }

        //Run up
        if (this.move.DirecMove.y === 1) {
            animName = 'LambRunUp';
        } else if (this.move.DirecMove.y === -1) {
            animName = 'LambRunDown';
        }

        if (this.currentAnim !== animName) {
            this.currentAnim = animName;
            this.animator.play(this.currentAnim);
        }
    }
}