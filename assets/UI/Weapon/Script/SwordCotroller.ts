import { _decorator, Component, Node, Vec3 } from 'cc';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';
const { ccclass, property } = _decorator;

@ccclass('SwordCotroller')
export class SwordCotroller extends Component {
    @property protected speedRotate: number = 1;
    @property public baseDamage: number = 10;
    protected _target: Node;
    protected _angleRotate: number;
    protected _radius: number;

    start() {
        this._target = PlayerController._playerInstance.node;
        this.getAngleWithTarget()
        this._radius = Vec3.distance(this.node.getPosition(), this._target.getPosition());
    }

    update(deltaTime: number) {
        this.rotatePosSword(deltaTime);
        this.rotateSpriteSword();
    }


    protected rotatePosSword(deltaTime: number) {
        if (!this._target) return;

        this._angleRotate -= this.speedRotate * deltaTime;
        const targetPos = this._target.getPosition();
        const angleRad = this._angleRotate * (Math.PI / 180);

        const newX = targetPos.x + this._radius * Math.cos(angleRad);
        const newY = targetPos.y + this._radius * Math.sin(angleRad);

        this.node.setPosition(newX, newY, this.node.position.z);
    }

    protected rotateSpriteSword() {
        if (!this._target) return;
        let angleRotateSprite = this._angleRotate + 270;
        this.node.setRotationFromEuler(0, 0, angleRotateSprite);
    }

    protected getAngleWithTarget(): void {
        const direction = new Vec3();
        Vec3.subtract(direction, this._target.getPosition(), this.node.getPosition());
        this._angleRotate = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
    }

    public recalculateAngle(): void {
        this.getAngleWithTarget();
        this._radius = Vec3.distance(this.node.getPosition(), this._target.getPosition());
    }
}


