import { _decorator, Collider2D, Component, Contact2DType } from 'cc';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
const { ccclass, property } = _decorator;

@ccclass('SkillsCollider')
export class SkillsCollider extends Component {
    @property protected damage: number = 10;

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        const damageable = otherCollider.node.getComponent(IDamageable);

        if (damageable && damageable.isAlive()) {
            damageable.takeDamage(this.damage);
            this.onHit(damageable);
        }
    }

    protected onHit(target: IDamageable): void {
    }
}
