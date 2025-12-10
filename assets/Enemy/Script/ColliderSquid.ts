import { _decorator, Component, Collider2D, Layers, Node, Contact2DType, RigidBody2D, IPhysics2DContact } from 'cc';
import { PlayerController } from '../../Player/Script/Core/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('ColliderSquid')
export class ColliderSquid extends Component {
    start() {
        let rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody && !rigidBody.enabledContactListener) {
            rigidBody.enabledContactListener = true;
        }

        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.sensor = true;
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
        const _layerNeedCheck = Layers.nameToLayer('Player');
        const _changeBitmask = 1 << _layerNeedCheck;

        if (otherCollider.node.layer & _changeBitmask) {
            const playerController = otherCollider.node.getComponent(PlayerController);

            if (playerController) {
                const DAMAGE = 25;
                playerController.hp -= DAMAGE;
            }
        }
    }
}
