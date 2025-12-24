import { _decorator, Component, Node, Prefab, resources, instantiate, RichText } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';

const { ccclass, property } = _decorator;

@ccclass('SkillsManager')
export class SkillsManager extends Component {
    private _activeSkills: Map<string, Node> = new Map();
    @property({ type: Node }) public text: Node;
    start() {
    }

    public addSkill(skillName: string): void {
        if (this._activeSkills.has(skillName)) {
            console.warn(`[SkillsManager] Skill "${skillName}" đã tồn tại!`);
            return;
        }
        if (skillName === "LightBullet") {
            this.text.active = true;
        }
        const skillPath = this._loadSkillConfig(skillName);
        if (!skillPath) {
            console.error(`[SkillsManager] Không tìm thấy config cho skill "${skillName}"`);
            return;
        }
        this._loadAndSpawnSkill(skillPath, skillName);
    }

    public removeSkill(skillName: string): void {
        const skillNode = this._activeSkills.get(skillName);
        if (!skillNode) {
            console.warn(`[SkillsManager] Skill "${skillName}" không tồn tại!`);
            return;
        }

        // Xóa khỏi scene và destroy
        skillNode.removeFromParent();
        skillNode.destroy();

        // Xóa khỏi Map
        this._activeSkills.delete(skillName);

        console.log(`[SkillsManager] Đã xóa skill "${skillName}"`);
    }

    public getActiveSkills(): string[] {
        return Array.from(this._activeSkills.keys());
    }

    public hasSkill(skillName: string): boolean {
        return this._activeSkills.has(skillName);
    }


    private _loadSkillConfig(skillName: string): string | null {
        const configData = ConfigLoader.sharedConfigData;

        // Kiểm tra config data
        if (!configData) {
            console.error('[SkillsManager] Config data chưa được load!');
            return null;
        }

        // Kiểm tra cấu trúc config
        if (!configData.Prefabs || !configData.Prefabs.Skills) {
            console.error('[SkillsManager] Config không có section Prefabs/Skills');
            return null;
        }

        // Lấy object Skills chứa tất cả skill configs
        const skillsConfig = configData.Prefabs.Skills;

        // Lấy path theo tên skill
        if (skillsConfig.hasOwnProperty(skillName)) {
            return skillsConfig[skillName];
        }

        return null;
    }


    private _loadAndSpawnSkill(skillPath: string, skillName: string): void {
        console.log(`[SkillsManager] Đang load skill "${skillName}" từ path: ${skillPath}`);

        resources.load(skillPath, Prefab, (err, prefab: Prefab) => {
            if (err) {
                console.error(`[SkillsManager] ❌ Lỗi load prefab "${skillPath}":`, err);
                console.error('[SkillsManager] Error details:', JSON.stringify(err));
                return;
            }

            if (!prefab) {
                console.error(`[SkillsManager] ❌ Prefab null cho path: ${skillPath}`);
                return;
            }

            console.log(`[SkillsManager] ✅ Load prefab thành công: ${skillName}`);

            const skillInstance = instantiate(prefab);

            if (!skillInstance) {
                console.error(`[SkillsManager] ❌ Không thể instantiate prefab: ${skillName}`);
                return;
            }

            skillInstance.name = `Skill_${skillName}`;
            this.node.addChild(skillInstance);
            this._activeSkills.set(skillName, skillInstance);

            console.log(`[SkillsManager] ✅ Spawn skill "${skillName}" thành công!`);
        });
    }
}
