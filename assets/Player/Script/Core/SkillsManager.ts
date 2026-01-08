import { _decorator, Component, Node, Prefab, resources, instantiate, RichText, Layers } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';

const { ccclass, property } = _decorator;

@ccclass('SkillsManager')
export class SkillsManager extends Component {
    private _activeSkills: Map<string, Node> = new Map();
    private _loadingSkills: Set<string> = new Set();
    start() {
    }

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
        });
    }
}
