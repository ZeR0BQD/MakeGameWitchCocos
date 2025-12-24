import { _decorator, Component, Node, Collider2D, Layers, Contact2DType, RigidBody2D, IPhysics2DContact, tween, Vec3, Tween } from 'cc';
import { SkillsManager } from 'db://assets/Player/Script/Core/SkillsManager';

const { ccclass, property } = _decorator;

@ccclass('BubbleController')
export class BubbleController extends Component {
    @property
    bounceHeight: number = 10;

    @property
    bounceSpeed: number = 2;

    @property({
        tooltip: 'Tên skill sẽ được add vào Player khi chạm (VD: Sword, Bow, Magic)',
        type: String
    })
    protected skillName: string = 'Sword';

    private _playerBitmask: number = 0;
    private _bounceTween: Tween<Node> | null = null;

    start() {
        const originalY = this.node.position.y;
        const upPos = new Vec3(this.node.position.x, originalY + this.bounceHeight, 0);
        const downPos = new Vec3(this.node.position.x, originalY - this.bounceHeight, 0);
        this._bounceTween = tween(this.node)
            .to(1 / this.bounceSpeed, { position: upPos }, { easing: 'sineInOut' })
            .to(1 / this.bounceSpeed, { position: downPos }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        const playerLayer = Layers.nameToLayer('Player');
        this._playerBitmask = 1 << playerLayer;

        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.sensor = true;
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.layer & this._playerBitmask) {
            this.adderToPlayer(otherCollider.node);
            this.scheduleOnce(() => {
                this.node.destroy();
            }, 0);
        }
    }

    onDestroy() {
        if (this._bounceTween) {
            this._bounceTween.stop();
            this._bounceTween = null;
        }

        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    adderToPlayer(playerNode: Node) {
        const skillsManagerNode = playerNode.getChildByName('SkillsManager');
        if (!skillsManagerNode) {
            console.error('[BubbleController] Không tìm thấy SkillsManager!');
            return;
        }

        const skillsManager = skillsManagerNode.getComponent(SkillsManager);
        if (!skillsManager) {
            console.error('[BubbleController] Không tìm thấy SkillsManager component!');
            return;
        }

        skillsManager.addSkill(this.skillName);
    }

    public setSkillName(skillName: string): void {
        this.skillName = skillName;
    }
}
