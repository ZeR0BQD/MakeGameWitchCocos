import { _decorator, Component, Node, Collider2D, Layers, Contact2DType, RigidBody2D, IPhysics2DContact, ERigidBody2DType } from 'cc';
import { PlayerController } from '../../../Player/Script/Core/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('BubbleController')
export class BubbleController extends Component {
    @property
    bounceHeight: number = 10; // Độ cao nảy 

    @property
    bounceSpeed: number = 2; // Tốc độ nảy 

    private _originalY: number = 0; // Vị trí Y ban đầu
    private _time: number = 0;
    start() {
        // Lưu vị trí Y ban đầu
        this._originalY = this.node.position.y;

        // Khởi tạo RigidBody2D (BẮT BUỘC để collision hoạt động)
        let rigidBody = this.getComponent(RigidBody2D);
        if (!rigidBody) {
            rigidBody = this.addComponent(RigidBody2D);
            console.log('⚙️ Auto-added RigidBody2D to Bubble');
        }

        if (rigidBody) {
            // Config RigidBody2D
            rigidBody.type = ERigidBody2DType.Kinematic; // Kinematic để không bị ảnh hưởng bởi gravity
            rigidBody.enabledContactListener = true; // BẮT BUỘC để nhận collision events
            console.log('✅ RigidBody2D configured: Type =', rigidBody.type, ', ContactListener =', rigidBody.enabledContactListener);
        }

        // Khởi tạo Collider
        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.sensor = true; // Sensor = true để không đẩy objects
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            console.log('✅ Bubble Collider initialized, sensor:', collider.sensor);
        } else {
            console.warn('❌ No Collider2D found on Bubble! Please add Collider2D in Editor');
        }
    }

    onDestroy() {
        // Cleanup: Hủy đăng ký event listener
        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        console.log('🔔 Collision detected! Other node:', otherCollider.node.name);

        // Tìm PlayerController từ current node hoặc parent nodes
        let playerController = otherCollider.node.getComponent(PlayerController);
        let checkNode = otherCollider.node;

        // Nếu không tìm thấy ở node hiện tại, tìm trong parent hierarchy
        while (!playerController && checkNode.parent) {
            checkNode = checkNode.parent;
            playerController = checkNode.getComponent(PlayerController);
            console.log('   Checking parent:', checkNode.name);
        }

        if (playerController) {
            console.log('   ✅✅ Bubble chạm vào Player! HP:', playerController.hp);
            // Sau khi test xong, uncomment dòng dưới để destroy
            // this.node.destroy();
        } else {
            console.log('   ❌ PlayerController not found in hierarchy');
        }
    }

    update(deltaTime: number) {
        // Tăng thời gian
        this._time += deltaTime * this.bounceSpeed;

        // Tính toán offset Y sử dụng sin wave (dao động từ -1 đến 1)
        const offset = Math.sin(this._time * Math.PI * 2) * this.bounceHeight;

        // Cập nhật vị trí Y của node
        const currentPos = this.node.position;
        this.node.setPosition(currentPos.x, this._originalY + offset, currentPos.z);
    }
}


