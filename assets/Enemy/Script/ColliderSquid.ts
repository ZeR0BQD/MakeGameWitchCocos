import { _decorator, Component, Collider2D, Layers, Node, Contact2DType } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ColliderSquid')
export class ColliderSquid extends Component {
    start() {
        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    update(deltaTime: number) {

    }
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
        if (otherCollider.node.layer === Layers.nameToLayer('Player')) {
            // Xử lý va chạm với Player ở đây
            console.log('Squid đã va chạm với Player!');
            // Ví dụ: Gọi hàm giảm máu của Player hoặc thực hiện hành động khác
        }
    }
}
