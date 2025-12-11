import { _decorator, Collider2D, Component, Contact2DType } from 'cc';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
import { SwordCotroller } from './SwordCotroller';
const { ccclass, property } = _decorator;

@ccclass('SwordCollider')
export class SwordCollider extends Component {
    protected swordController: SwordCotroller = null;

    start() {
        this.swordController = this.getComponent(SwordCotroller);

        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        const damageable = otherCollider.node.getComponent(IDamageable);

        if (damageable && damageable.isAlive()) {
            damageable.takeDamage(this.swordController?.baseDamage ?? 10);
        }
    }
}