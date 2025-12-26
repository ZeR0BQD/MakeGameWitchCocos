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
        if (!this.move || !this.move.DirecMove) {
            console.warn("[LambAnim] Movement or DirecMove is null!");
            return;
        }

        const dir = this.move.DirecMove;
        let animName = '';

        // Kiểm tra nếu đang đứng yên
        if (Math.abs(dir.x) < 0.1 && Math.abs(dir.y) < 0.1) {
            animName = 'LambIdle';
        } else {
            // Ưu tiên animation dựa trên hướng có giá trị lớn hơn
            const absX = Math.abs(dir.x);
            const absY = Math.abs(dir.y);

            if (absY > absX) {
                // Ưu tiên lên/xuống
                if (dir.y > 0) {
                    animName = 'LambRunUp';
                } else {
                    animName = 'LambRunDown';
                }
            } else {
                // Ưu tiên trái/phải
                animName = 'LambRunRight';
            }
        }

        // Chỉ switch animation khi khác
        if (this.currentAnim !== animName) {
            console.log(`[LambAnim] ${this.currentAnim} → ${animName}, dir: (${dir.x.toFixed(2)}, ${dir.y.toFixed(2)})`);
            this.currentAnim = animName;

            if (this.animator) {
                this.animator.play(this.currentAnim);
            } else {
                console.warn("[LambAnim] Animator is null!");
            }
        }
    }
}