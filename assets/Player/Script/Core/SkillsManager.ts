import { _decorator, Component, Node, Prefab, resources, instantiate, RichText } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';

const { ccclass, property } = _decorator;

@ccclass('SkillsManager')
export class SkillsManager extends Component {
    private _activeSkills: Map<string, Node> = new Map();
    private _loadingSkills: Set<string> = new Set(); // Track skills đang load để tránh duplicate
    @property({ type: Node }) public text: Node;
    start() {
    }

    public addSkill(skillName: string): void {
        // Kiểm tra skill đã active 
        if (this._activeSkills.has(skillName)) {
            console.warn(`[SkillsManager] Skill "${skillName}" đã tồn tại!`);
            return;
        }

        if (this._loadingSkills.has(skillName)) {
            return;
        }

        this._loadingSkills.add(skillName);
        console.log(`[SkillsManager] Bắt đầu load skill "${skillName}"`);

        if (skillName === "LightBullet") {
            this.text.active = true;
        }

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
                console.error(`[SkillsManager] Lỗi load prefab "${skillPath}":`, err);
                console.error('[SkillsManager] Error details:', JSON.stringify(err));
                this._loadingSkills.delete(skillName); // Cleanup khi lỗi
                return;
            }

            if (!prefab) {
                console.error(`[SkillsManager] Prefab null cho path: ${skillPath}`);
                this._loadingSkills.delete(skillName); // Cleanup khi lỗi
                return;
            }

            console.log(`[SkillsManager] Load prefab thành công: ${skillName}`);

            const skillInstance = instantiate(prefab);

            if (!skillInstance) {
                console.error(`[SkillsManager] Không thể instantiate prefab: ${skillName}`);
                this._loadingSkills.delete(skillName); // Cleanup khi lỗi
                return;
            }

            skillInstance.name = `Skill_${skillName}`;
            this.node.addChild(skillInstance);
            this._activeSkills.set(skillName, skillInstance);
            this._loadingSkills.delete(skillName); // Xóa khỏi loading state sau khi spawn thành công

            console.log(`[SkillsManager] Spawn skill "${skillName}" thành công!`);
        });
    }
}
