import { _decorator, Component, Node, Prefab, resources, instantiate } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';

const { ccclass, property } = _decorator;

/**
 * SkillsManager - Quản lý việc load và spawn skills cho Player
 * Add component này vào child node của Player để quản lý skills
 */
@ccclass('SkillsManager')
export class SkillsManager extends Component {

    // Map để lưu các skill instances đang active
    private _activeSkills: Map<string, Node> = new Map();

    start() {
    }

    public addSkill(skillName: string): void {
        if (this._activeSkills.has(skillName)) {
            console.warn(`[SkillsManager] Skill "${skillName}" đã tồn tại!`);
            return;
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

        // Load prefab từ resources
        resources.load(skillPath, Prefab, (err, prefab: Prefab) => {
            if (err) {
                console.error(`[SkillsManager] Lỗi load prefab "${skillPath}":`, err);
                return;
            }

            // Instantiate prefab 
            const skillInstance = instantiate(prefab);

            // Set tên cho node (để dễ debug)
            skillInstance.name = `Skill_${skillName}`;

            // Thêm vào Player node (this.node là SkillsManager node - child của Player)
            this.node.addChild(skillInstance);

            // Lưu vào Map để quản lý
            this._activeSkills.set(skillName, skillInstance);

        });
    }
}
