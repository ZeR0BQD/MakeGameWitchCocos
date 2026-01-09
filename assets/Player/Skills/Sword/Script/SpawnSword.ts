import { _decorator, CCInteger, Node } from 'cc';
import { SpawnAroundPlayer } from 'db://assets/Player/Skills/Script/SpawnAroundPlayer';
import { SwordCotroller } from './SwordCotroller';
import { ISkill } from '../../Script/ISkill';
import { SkillsManager } from 'db://assets/Player/Script/Core/SkillsManager';

const { ccclass, property } = _decorator;

@ccclass('SpawnSword')
export class SpawnSword extends SpawnAroundPlayer implements ISkill {
    @property({ type: CCInteger, override: true }) public numberOfObjects: number = 3;
    @property({ override: true }) public distanceSpawn: number = 100;

    // ISkill properties
    public readonly skillName: string = 'Sword';
    public readonly maxCooldown: number = 0; // Không có cooldown
    public readonly maxStacks: number = 0;   // Không có stacks
    public readonly activateKeyCode = null;  // Không có phím tắt

    onLoad() {
        super.onLoad();

        // Auto-register vào SkillsManager
        SkillsManager.instance?.registerSkill(this);
    }

    onDestroy() {
        // Unregister khỏi SkillsManager
        SkillsManager.instance?.unregisterSkill(this.skillName);
    }

    start() {
        super.start();
        this.activateSkill(); // Gọi thông qua interface method
    }

    /**
     * METHOD CHÍNH từ ISkill interface
     */
    public activateSkill(): void {
        this.activate(); // Gọi base class method
    }

    protected onSpawned(sword: Node, angle: number, isRedistribute: boolean): void {
        if (!isRedistribute) return;

        const controller = sword.getComponent(SwordCotroller);
        if (controller) {
            controller.recalculateAngle();
        }
    }
}
