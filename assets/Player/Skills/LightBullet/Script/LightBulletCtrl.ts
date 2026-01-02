import { _decorator, Collider2D, Contact2DType, Node, Vec3 } from 'cc';
import { SkillsCollider } from 'db://assets/Player/Skills/Script/SkillsCollider';
import { PlayerController } from '../../../Script/Core/PlayerController';
import { IDamageable } from 'db://assets/Enemy/IDamageable';
const { ccclass, property } = _decorator;

@ccclass('LightBulletCtrl')
export class LightBulletCtrl extends SkillsCollider {
    @property({ override: true }) damage: number = 10;
    @property speed: number = 500;
    @property({ tooltip: 'Thời gian tồn tại tối đa (giây)' })
    public maxLifetime: number = 2.5;

    protected _target: Node;
    protected _direction: Vec3 = new Vec3();
    protected _lifetimeTimer: number = 0;
    protected _isActive: boolean = false;

    start() {
        super.start();
        this._target = PlayerController._instance.node;
    }

    onEnable() {
        this._lifetimeTimer = 0;
        this._isActive = true;
        this['_hasHit'] = false; // Reset collision guard từ parent class
    }

    onDisable() {
        this._isActive = false;
    }

    public setRotation(angle: number): void {
        const angleDeg = angle * (180 / Math.PI);
        const spriteAngle = angleDeg;
        this.node.setRotationFromEuler(0, 0, spriteAngle);
        this._direction.x = Math.cos(angle);
        this._direction.y = Math.sin(angle);
    }

    update(deltaTime: number) {
        if (!this._isActive) return;

        this._lifetimeTimer += deltaTime;

        if (this._lifetimeTimer >= this.maxLifetime) {
            this.requestReturn();
            return;
        }

        const pos = this.node.getPosition();
        pos.x += this._direction.x * this.speed * deltaTime;
        pos.y += this._direction.y * this.speed * deltaTime;
        this.node.setPosition(pos);
    }

    protected onHit(target: IDamageable): void {
        this.requestReturn();
    }

    private requestReturn(): void {
        this._isActive = false;
        this.node.emit('return-to-pool');
    }
}
