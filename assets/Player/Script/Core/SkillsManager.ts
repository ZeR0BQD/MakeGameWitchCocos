import { _decorator, Component, Node, Prefab, resources, instantiate, RichText, Layers } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';
import { ISkill } from 'db://assets/Player/Skills/Script/ISkill';
import { UIManager } from 'db://assets/UI/Script/UIManager';

const { ccclass, property } = _decorator;

@ccclass('SkillsManager')
export class SkillsManager extends Component {
    // Singleton instance
    private static _instance: SkillsManager = null;

    public static get instance(): SkillsManager {
        if (!this._instance) {
            console.warn('[SkillsManager]<instance> Instance chưa được khởi tạo!');
        }
        return this._instance;
    }

    // Registry - Map lưu skill components theo skillName
    private _skillRegistry: Map<string, ISkill> = new Map();

    // Existing properties - Dynamic skill loading
    private _activeSkills: Map<string, Node> = new Map();
    private _loadingSkills: Set<string> = new Set();

    onLoad() {
        // Singleton setup
        if (SkillsManager._instance && SkillsManager._instance !== this) {
            console.warn('[SkillsManager]<onLoad> Instance đã tồn tại, hủy duplicate');
            this.destroy();
            return;
        }
        SkillsManager._instance = this;
        console.log('[SkillsManager]<onLoad> Singleton initialized');
    }

    start() {
    }

    // ===== Registry Methods =====

    /**
     * Đăng ký skill vào registry
     * Được gọi từ skill component trong onLoad()
     */
    public registerSkill(skill: ISkill): void {
        if (this._skillRegistry.has(skill.skillName)) {
            console.warn(`[SkillsManager]<registerSkill> Skill ${skill.skillName} đã tồn tại, ghi đè`);
        }
        this._skillRegistry.set(skill.skillName, skill);
        console.log(`[SkillsManager]<registerSkill> Đã đăng ký: ${skill.skillName}`);
    }

    /**
     * Hủy đăng ký skill
     */
    public unregisterSkill(skillName: string): void {
        if (this._skillRegistry.delete(skillName)) {
            console.log(`[SkillsManager]<unregisterSkill> Đã xóa skill: ${skillName}`);
        }
    }

    /**
     * Kích hoạt skill theo skillName - METHOD CHÍNH cho SkillButton
     * PUBLISH UI events thông qua UIManager
     */
    public activateSkill(skillName: string): void {
        const skill = this._skillRegistry.get(skillName);
        if (!skill) {
            console.error(`[SkillsManager]<activateSkill> Không tìm thấy skill: ${skillName}`);
            return;
        }

        console.log(`[SkillsManager]<activateSkill> Kích hoạt: ${skill.skillName}`);

        // Activate skill logic
        skill.activateSkill();

        // PUBLISH UI event cho SkillButton và các UI components khác
        UIManager.getInstance()?.publish('skill-activated', {
            skillName: skill.skillName,
            maxCooldown: skill.maxCooldown,
            maxStacks: skill.maxStacks
        });
    }

    /**
     * Lấy skill instance theo skillName
     */
    public getSkill(skillName: string): ISkill | undefined {
        return this._skillRegistry.get(skillName);
    }

    /**
     * Kiểm tra skill có tồn tại không
     */
    public hasSkill(skillName: string): boolean {
        return this._skillRegistry.has(skillName);
    }

    /**
     * Lấy danh sách tất cả skills
     */
    public getAllSkills(): ISkill[] {
        return Array.from(this._skillRegistry.values());
    }

    // ===== Dynamic Skill Loading (Existing Logic) =====

    public addSkill(skillName: string): void {
        if (this._activeSkills.has(skillName)) {
            return;
        }

        if (this._loadingSkills.has(skillName)) {
            return;
        }

        this._loadingSkills.add(skillName);

        const skillPath = this._loadSkillConfig(skillName);
        if (!skillPath) {
            console.error(`[SkillsManager] Không tìm thấy config cho skill "${skillName}"`);
            this._loadingSkills.delete(skillName);
            return;
        }
        this._loadAndSpawnSkill(skillPath, skillName);
    }

    public removeSkill(skillName: string): void {
        const skillNode = this._activeSkills.get(skillName);
        if (!skillNode) {
            return;
        }

        skillNode.removeFromParent();
        skillNode.destroy();
        this._activeSkills.delete(skillName);
    }


    private _loadSkillConfig(skillName: string): string | null {
        const configData = ConfigLoader.sharedConfigData;

        if (!configData) {
            console.error('[SkillsManager] Config data chưa được load!');
            return null;
        }

        if (!configData.Prefabs || !configData.Prefabs.Skills) {
            console.error('[SkillsManager] Config không có section Prefabs/Skills');
            return null;
        }

        const skillsConfig = configData.Prefabs.Skills;

        if (skillsConfig.hasOwnProperty(skillName)) {
            return skillsConfig[skillName].prefab;
        }

        return null;
    }


    private _loadAndSpawnSkill(skillPath: string, skillName: string): void {
        resources.load(skillPath, Prefab, (err, prefab: Prefab) => {
            if (err) {
                console.error(`[SkillsManager] Lỗi load prefab "${skillPath}":`, err);
                this._loadingSkills.delete(skillName);
                return;
            }

            if (!prefab) {
                console.error(`[SkillsManager] Prefab null cho path: ${skillPath}`);
                this._loadingSkills.delete(skillName);
                return;
            }

            const skillInstance = instantiate(prefab);

            if (!skillInstance) {
                console.error(`[SkillsManager] Không thể instantiate prefab: ${skillName}`);
                this._loadingSkills.delete(skillName);
                return;
            }

            skillInstance.name = `Skill_${skillName}`;
            this.node.addChild(skillInstance);
            skillInstance.layer = 4;
            this._activeSkills.set(skillName, skillInstance);
            this._loadingSkills.delete(skillName);

            // PUBLISH event cho SkillMenu và UI components khác
            UIManager.getInstance()?.publish('skill-added', {
                skillName: skillName
            });
            console.log(`[SkillsManager]<_loadAndSpawnSkill> Published 'skill-added' event for: ${skillName}`);
        });
    }
}
