import { SpriteFrame, KeyCode } from 'cc';

/**
 * Interface chuẩn cho tất cả skills trong game
 * Skills chỉ cần provide static info và implement activateSkill()
 */
export interface ISkill {
    // Static info - SkillButton đọc để display UI
    readonly skillName: string;             // "Light Bullet", "Sword" - Tên hiển thị
    readonly maxCooldown: number;           // Cooldown tối đa (giây), 0 = không có cooldown
    readonly maxStacks: number;             // Stack tối đa, 0 = không có stacks
    readonly activateKeyCode: KeyCode | null; // Phím tắt kích hoạt (null = không có)

    // Runtime method
    activateSkill(): void;                  // METHOD DUY NHẤT - kích hoạt skill
}
