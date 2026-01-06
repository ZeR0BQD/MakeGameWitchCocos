import { _decorator, Component, Prefab, Node, instantiate, Vec3, SpriteFrame, SpriteRenderer, resources } from 'cc';
import { UIManager } from 'db://assets/UI/Script/UIManager';
import { IUISubscriber } from 'db://assets/UI/Script/IUISubscriber';
import { BubbleController } from './BubbleController';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';

const { ccclass, property } = _decorator;

@ccclass('InstanceSkills')
export class InstanceSkills extends Component implements IUISubscriber {
    @property({ type: Prefab })
    private bubblePrefab: Prefab = null;

    @property({ type: Node })
    private bubbleContainer: Node = null;

    private _bubbleDropRate: number = 20;
    private _skillDropConfig: any = null;
    private _skillConfig: any = null;
    private _spriteCache: Map<string, SpriteFrame> = new Map();

    start() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.subscribe(this, 'enemyDie');
        }
        this._loadConfig();

        if (!this.bubbleContainer) {
            console.warn('[InstanceSkills] Bubble container NOT assigned!');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'enemyDie');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'enemyDie') {
            const { position, playerLevel } = data;
            this.spawnBubble(position, playerLevel);
        }
    }

    private _loadConfig(): void {
        this._skillConfig = ConfigLoader.sharedConfigData;
        if (!this._skillConfig) {
            console.warn('[InstanceSkills] Config data not loaded');
            return;
        }

        if (this._skillConfig.bubble) {
            this._bubbleDropRate = this._skillConfig.bubble.bubbleDropRate || 20;
            this._skillDropConfig = this._skillConfig.bubble.skillDropRate || null;
        } else {
            console.error('[InstanceSkills] Bubble config not found!');
        }

        this._preloadAllSkillSprites();
    }

    private _preloadAllSkillSprites(): void {
        if (!this._skillConfig?.Prefabs?.Skills) {
            console.warn('[InstanceSkills] No skills to preload');
            return;
        }

        const skills = this._skillConfig.Prefabs.Skills;

        for (const skillName in skills) {
            const spritePath = skills[skillName].sprite;
            if (!spritePath) continue;

            resources.load(spritePath, SpriteFrame, (err, spriteFrame: SpriteFrame) => {
                if (err) {
                    console.error(`[InstanceSkills] Failed to preload "${skillName}":`, err);
                    return;
                }

                this._spriteCache.set(skillName, spriteFrame);
            });
        }
    }

    private randomBubbleDrop(): boolean {
        const roll = Math.random() * 100;
        const willDrop = roll < this._bubbleDropRate;
        console.log(`[InstanceSkills] Drop roll: ${roll.toFixed(2)} < ${this._bubbleDropRate}? ${willDrop}`);
        return willDrop;
    }

    private randomSkillType(playerLevel: number): string {
        if (!this._skillDropConfig) {
            console.warn('[InstanceSkills] No skill config, default to Sword');
            return 'Sword';
        }

        const milestone = this._findClosestMilestone(playerLevel);
        const dropRates = this._skillDropConfig[milestone.toString()];

        if (!dropRates) {
            console.warn(`[InstanceSkills] No drop rate for milestone ${milestone}, default to Sword`);
            return 'Sword';
        }

        console.log(`[InstanceSkills] Drop rates for level ${playerLevel} (milestone ${milestone}):`, dropRates);

        const random = Math.random() * 100;
        let accumulated = 0;

        for (const skillName in dropRates) {
            const rate = dropRates[skillName];
            accumulated += rate;
            console.log(`[InstanceSkills] Checking ${skillName}: accumulated ${accumulated}, roll ${random}`);
            if (random < accumulated) {
                console.log(`[InstanceSkills] Selected: ${skillName}`);
                return skillName;
            }
        }

        console.log('[InstanceSkills] No match, fallback to Sword');
        return 'Sword';
    }

    private _findClosestMilestone(playerLevel: number): number {
        if (!this._skillDropConfig) {
            return 2;
        }

        const milestones = Object.keys(this._skillDropConfig)
            .map(key => parseInt(key))
            .sort((a, b) => a - b);

        if (milestones.length === 0) {
            return 2;
        }

        let closestMilestone = milestones[0];

        for (const milestone of milestones) {
            if (playerLevel >= milestone) {
                closestMilestone = milestone;
            } else {
                break;
            }
        }

        return closestMilestone;
    }

    private injectSkillToBubble(bubble: Node, skillName: string): void {
        const bubbleCtrl = bubble.getComponent(BubbleController);
        if (bubbleCtrl) {
            bubbleCtrl.setSkillName(skillName);
            console.log(`[InstanceSkills] Injected skill: ${skillName}`);
        } else {
            console.error('[InstanceSkills] BubbleController not found!');
        }
    }

    private _setSkillSprite(bubble: Node, skillName: string): void {
        const adderNode = bubble.getChildByName("Adder");
        if (!adderNode) {
            console.error('[InstanceSkills] Adder node not found in bubble!');
            return;
        }

        const spriteRenderer = adderNode.getComponent(SpriteRenderer);
        if (!spriteRenderer) {
            console.error('[InstanceSkills] SpriteRenderer not found on Adder!');
            return;
        }

        const cachedSprite = this._spriteCache.get(skillName);
        if (cachedSprite) {
            spriteRenderer.spriteFrame = cachedSprite;
            console.log(`[InstanceSkills] ✅ Set cached sprite: ${skillName}`);
        } else {
            console.warn(`[InstanceSkills] ⚠️ Sprite not cached yet: ${skillName}`);
        }
    }

    private spawnBubble(position: Vec3, playerLevel: number): void {
        if (!this.randomBubbleDrop()) {
            console.log('[InstanceSkills] Drop failed');
            return;
        }

        console.log('[InstanceSkills] Drop success! Spawning...');

        if (!this.bubblePrefab) {
            console.error('[InstanceSkills] Bubble prefab not assigned!');
            return;
        }

        if (!this.bubbleContainer) {
            console.error('[InstanceSkills] Bubble container not assigned!');
            return;
        }

        const skillName = this.randomSkillType(playerLevel);
        const bubble = instantiate(this.bubblePrefab);

        bubble.active = false;
        this.bubbleContainer.addChild(bubble);
        bubble.setPosition(position);
        this.injectSkillToBubble(bubble, skillName);
        this._setSkillSprite(bubble, skillName);

        this.scheduleOnce(() => {
            bubble.active = true;
            console.log(`[InstanceSkills] Bubble activated: ${skillName}`);
        }, 0);

        console.log(`[InstanceSkills] Spawned at level ${playerLevel}`);
    }
}
