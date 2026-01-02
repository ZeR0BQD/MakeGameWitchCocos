import { _decorator, Collider2D, Component, Contact2DType } from 'cc';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
const { ccclass, property } = _decorator;

@ccclass('SkillsCollider')
export class SkillsCollider extends Component {
    @property protected damage: number = 10;
    protected _hasHit: boolean = false;

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        const damageable = otherCollider.node.getComponent(IDamageable);

        if (this._hasHit) return;

        if (damageable && damageable.isAlive()) {
            this._hasHit = true;
            damageable.takeDamage(this.damage);
            this.onHit(damageable);
        }
        this._hasHit = false;
    }

    protected onHit(target: IDamageable): void {
    }
}
