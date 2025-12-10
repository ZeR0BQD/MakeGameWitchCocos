import { _decorator, Component, Node, RigidBody2D, Collider2D, Contact2DType, Layers, IPhysics2DContact } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ColliderPlayer')
export class ColliderPlayer extends Component {
    start() {
        let rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            if (!rigidBody.enabledContactListener) {
                rigidBody.enabledContactListener = true;
            }
        }

        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onDestroy() {
        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        const _layerNeedCheck = Layers.nameToLayer('Enemy');
        const _changeBitmask = 1 << _layerNeedCheck;
        if (otherCollider.node.layer & _changeBitmask) {
            console.log('PLAYER: Va chạm với Enemy -', otherCollider.node.name);
        }
    }

}

