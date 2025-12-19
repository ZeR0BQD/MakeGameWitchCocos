import { _decorator, Component, Node, Animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AnimCardUpgrade')
export class AnimCardUpgrade extends Component {
    protected anim: Animation;
    protected onLoad(): void {
        this.anim = this.getComponent(Animation);
    }

    onEnable() {
        this.anim.play('CardStart');
    }
}


