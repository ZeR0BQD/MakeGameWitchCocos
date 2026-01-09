import { _decorator, Component, Button, Sprite, Label, ProgressBar, Node } from 'cc';
import { SkillsManager } from 'db://assets/Player/Script/Core/SkillsManager';
import { ISkill } from 'db://assets/Player/Skills/Script/ISkill';
import { UIManager } from 'db://assets/UI/Script/UIManager';
import { IUISubscriber } from 'db://assets/UI/Script/IUISubscriber';
import { InstanceSkills } from 'db://assets/UI/Bubble/Script/InstanceSkills';

const { ccclass, property } = _decorator;

/**
 * Component quản lý skill button UI
 * Đọc thông tin từ ISkill và inject vào các child nodes
 * Subscribe vào UIManager để nhận UI events từ SkillsManager
 */
@ccclass('SkillButton')
export class SkillButton extends Component implements IUISubscriber {
    // ===== Properties =====
    @property({ tooltip: 'Tên của skill (ví dụ: "Light Bullet", "Sword")' })
    private skillName: string = '';

    // Internal state
    private _button: Button = null;
    private _skill: ISkill = null;

    // Child nodes - Tự động tìm
    private _centerImage: Sprite = null;
    private _cooldownNode: Node = null;
    private _cooldownBar: ProgressBar = null;
    private _stackNode: Node = null;
    private _stackLabel: Label = null;

    // Tracking state - SkillButton tự track
    private _currentCooldown: number = 0;
    private _currentStacks: number = 0;

    // ===== Lifecycle Methods =====
    onLoad() {
        this._button = this.getComponent(Button);
        this.node.on(Button.EventType.CLICK, this.onButtonClick, this);

        // Tìm child nodes
        this._findChildNodes();
    }

    onDestroy() {
        // UNSUBSCRIBE khỏi UIManager
        UIManager.getInstance()?.unsubscribe(this, 'skill-activated');
    }

    start() {
        if (this._cooldownNode) this._cooldownNode.active = false;
        if (this._stackNode) this._stackNode.active = false;

        const uiManager = UIManager.getInstance();
        if (!uiManager) {
            console.error('[SkillButton]<start> UIManager instance is NULL!');
            return;
        }

        uiManager.subscribe(this, 'skill-activated');

        if (this.skillName) {
            this._skill = SkillsManager.instance?.getSkill(this.skillName);
            if (this._skill) {
                this._initializeUI();
            } else {
                console.warn(`[SkillButton] Skill not found: ${this.skillName}`);
            }
        }
    }

    update(dt: number) {
        if (!this._skill) return;

        if (this._skill.maxStacks > 0 && this._skill.maxCooldown > 0) {
            if (this._currentStacks < this._skill.maxStacks) {
                this._currentCooldown -= dt;

                if (this._currentCooldown <= 0) {
                    this._currentStacks++;

                    if (this._currentStacks < this._skill.maxStacks) {
                        this._currentCooldown = this._skill.maxCooldown;
                    } else {
                        this._currentCooldown = 0;
                    }
                }

                if (this._cooldownBar) {
                    this._cooldownBar.progress = this._currentCooldown / this._skill.maxCooldown;
                }

                // Show cooldown during recharge
                if (this._cooldownNode) {
                    this._cooldownNode.active = true;
                }
            } else {
                if (this._cooldownBar) {
                    this._cooldownBar.progress = 1;
                }

                // Hide cooldown when full stacks
                if (this._cooldownNode) {
                    this._cooldownNode.active = false;
                }
            }

            // Stack label always visible
            if (this._stackLabel) {
                this._stackLabel.string = `${this._currentStacks}`;
            }
        } else if (this._skill.maxCooldown > 0) {
            // Non-stack skills: Standard cooldown
            if (this._currentCooldown > 0) {
                this._currentCooldown -= dt;
                if (this._currentCooldown < 0) this._currentCooldown = 0;
            }

            if (this._cooldownBar) {
                const progress = 1 - (this._currentCooldown / this._skill.maxCooldown);
                this._cooldownBar.progress = progress;
            }
        }
    }

    // ===== Public Methods =====

    /**
     * Set skill name dynamically (từ SkillMenu hoặc code khác)
     */
    public setSkillName(skillName: string): void {
        this.skillName = skillName;
        this._skill = SkillsManager.instance?.getSkill(skillName);

        if (this._skill) {
            this._initializeUI();
        } else {
            console.error(`[SkillButton] Skill not found: ${skillName}`);
        }
    }



    // ===== IUISubscriber Implementation =====

    /**
     * Handler cho UI events từ UIManager
     * SkillsManager publish, SkillButton nhận và xử lý
     */
    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'skill-activated' && data.skillName === this.skillName) {
            this._handleSkillActivated(data);
        }
    }

    private _handleSkillActivated(data: any): void {
        if (data.maxStacks > 0) {
            this._currentStacks--;
            if (this._currentStacks < 0) this._currentStacks = 0;

            if (this._currentStacks < data.maxStacks && this._currentCooldown <= 0) {
                this._currentCooldown = data.maxCooldown;
            }
        } else if (data.maxCooldown > 0) {
            this._currentCooldown = data.maxCooldown;
        }
    }

    // ===== Private Methods =====

    /**
     * Tìm các child nodes cần thiết
     */
    private _findChildNodes(): void {
        // Tìm CenterImage
        const centerImageNode = this.node.getChildByName('CenterImage');
        if (centerImageNode) {
            this._centerImage = centerImageNode.getComponent(Sprite);
            if (!this._centerImage) {
                console.warn('[SkillButton]<_findChildNodes> CenterImage không có Sprite component');
            }
        } else {
            console.warn('[SkillButton]<_findChildNodes> Không tìm thấy child node "CenterImage"');
        }

        // Tìm Cooldown node và ProgressBar
        this._cooldownNode = this.node.getChildByName('Cooldown');
        if (this._cooldownNode) {
            this._cooldownBar = this._cooldownNode.getComponent(ProgressBar);
            if (!this._cooldownBar) {
                console.warn('[SkillButton]<_findChildNodes> Cooldown node không có ProgressBar component');
            }
        }

        // Tìm Stack node và Label
        this._stackNode = this.node.getChildByName('Stack');
        if (this._stackNode) {
            this._stackLabel = this._stackNode.getComponent(Label);
            if (!this._stackLabel) {
                console.warn('[SkillButton]<_findChildNodes> Stack node không có Label component');
            }
        }
    }

    /**
     * Click handler - activate skill
     */
    private onButtonClick(): void {
        if (!this.skillName || !this._skill) {
            console.warn('[SkillButton] Skill not set');
            return;
        }

        if (this._skill.maxStacks > 0) {
            if (this._currentStacks <= 0) {
                return;
            }
        } else {
            if (this._skill.maxCooldown > 0 && this._currentCooldown > 0) {
                return;
            }
        }

        SkillsManager.instance?.activateSkill(this.skillName);
    }

    /**
     * Initialize UI khi skill được set
     * LOGIC NGHIỆP VỤ: Inject skill info vào child nodes
     */
    private _initializeUI(): void {
        if (!this._skill) return;

        if (this._centerImage) {
            const sprite = InstanceSkills.getInstance()?.getSpriteBySkillName(this._skill.skillName);
            if (sprite) {
                this._centerImage.spriteFrame = sprite;
            } else {
                console.warn(`[SkillButton] Sprite not found: ${this._skill.skillName}`);
            }
        }

        if (this._cooldownNode) {
            if (this._skill.maxCooldown > 0) {
                this._cooldownNode.active = true;
                this._currentCooldown = 0;
                if (this._cooldownBar) {
                    this._cooldownBar.progress = 1;
                }
            } else {
                this._cooldownNode.active = false;
            }
        }

        if (this._stackNode) {
            // Mặc định tắt, chỉ bật khi có stack
            this._stackNode.active = false;

            if (this._skill.maxStacks > 0) {
                this._stackNode.active = true;
                this._currentStacks = this._skill.maxStacks;

                if (this._stackLabel) {
                    this._stackLabel.string = `${this._currentStacks}`;
                }
            }
        }
    }
}
