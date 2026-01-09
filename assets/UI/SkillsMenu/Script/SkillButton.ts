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

        // SUBSCRIBE vào UIManager
        UIManager.getInstance()?.subscribe(this, 'skill-activated');
    }

    onDestroy() {
        // UNSUBSCRIBE khỏi UIManager
        UIManager.getInstance()?.unsubscribe(this, 'skill-activated');
    }

    start() {
        if (this.skillName) {
            this._skill = SkillsManager.instance?.getSkill(this.skillName);
            if (this._skill) {
                this._initializeUI();
            } else {
                console.warn(`[SkillButton]<start> Không tìm thấy skill: ${this.skillName}`);
            }
        }
    }

    update(dt: number) {
        if (!this._skill) return;

        // Update cooldown progress
        if (this._skill.maxCooldown > 0 && this._currentCooldown > 0) {
            this._currentCooldown -= dt;
            if (this._currentCooldown < 0) this._currentCooldown = 0;

            // Update progress bar
            if (this._cooldownBar) {
                const progress = 1 - (this._currentCooldown / this._skill.maxCooldown);
                this._cooldownBar.progress = progress;
            }
        }

        // Update stack label
        if (this._skill.maxStacks > 0 && this._stackLabel) {
            // Try query từ skill nếu có method getCurrentStacks()
            const skillAny = this._skill as any;
            if (typeof skillAny.getCurrentStacks === 'function') {
                this._currentStacks = skillAny.getCurrentStacks();
            }
            this._stackLabel.string = `${this._currentStacks}/${this._skill.maxStacks}`;
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
            console.log(`[SkillButton]<setSkillName> Đã set skill: ${this._skill.skillName}`);
        } else {
            console.error(`[SkillButton]<setSkillName> Không tìm thấy skill: ${skillName}`);
        }
    }



    // ===== IUISubscriber Implementation =====

    /**
     * Handler cho UI events từ UIManager
     * SkillsManager publish, SkillButton nhận và xử lý
     */
    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'skill-activated') {
            // Chỉ xử lý nếu event là cho skill này
            if (data.skillName === this.skillName) {
                this._handleSkillActivated(data);
            }
        }
    }

    private _handleSkillActivated(data: any): void {
        console.log(`[SkillButton]<_handleSkillActivated> Nhận event cho skill: ${data.skillName}`);

        // Update cooldown tracking
        if (data.maxCooldown > 0) {
            this._currentCooldown = data.maxCooldown;
        }

        // Update stack tracking
        if (data.maxStacks > 0) {
            this._currentStacks--;
            if (this._currentStacks < 0) this._currentStacks = 0;
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
            console.warn('[SkillButton]<onButtonClick> Skill chưa được set');
            return;
        }

        // Check cooldown (SkillButton tự check)
        if (this._skill.maxCooldown > 0 && this._currentCooldown > 0) {
            console.log(`[SkillButton]<onButtonClick> Skill đang cooldown: ${this._currentCooldown.toFixed(1)}s`);
            return;
        }

        // Check stacks (SkillButton tự check hoặc query từ skill)
        if (this._skill.maxStacks > 0 && this._currentStacks <= 0) {
            console.log('[SkillButton]<onButtonClick> Không còn stacks');
            return;
        }

        console.log(`[SkillButton]<onButtonClick> Kích hoạt skill: ${this.skillName}`);

        // CHÍNH: Gọi qua SkillsManager (không gọi trực tiếp skill.activateSkill)
        // SkillsManager sẽ publish event → UIManager → _handleSkillActivated() update tracking
        SkillsManager.instance?.activateSkill(this.skillName);
    }

    /**
     * Initialize UI khi skill được set
     * LOGIC NGHIỆP VỤ: Inject skill info vào child nodes
     */
    private _initializeUI(): void {
        if (!this._skill) return;

        // 1. INJECT ICON từ InstanceSkills
        if (this._centerImage) {
            // Đối chiếu skillName với InstanceSkills sprite cache
            const sprite = InstanceSkills.getInstance()?.getSpriteBySkillName(this._skill.skillName);
            if (sprite) {
                this._centerImage.spriteFrame = sprite;
                console.log(`[SkillButton]<_initializeUI> Đã inject icon từ InstanceSkills cho ${this._skill.skillName}`);
            } else {
                console.warn(`[SkillButton]<_initializeUI> Không tìm thấy sprite cho ${this._skill.skillName}`);
            }
        }

        // 2. XỬ LÝ COOLDOWN NODE
        if (this._cooldownNode) {
            if (this._skill.maxCooldown > 0) {
                // Có cooldown → Active node và setup
                this._cooldownNode.active = true;
                this._currentCooldown = 0; // Ban đầu ready

                if (this._cooldownBar) {
                    this._cooldownBar.progress = 1; // Full progress = ready
                }
                console.log(`[SkillButton]<_initializeUI> Cooldown node active (maxCooldown: ${this._skill.maxCooldown}s)`);
            } else {
                // Không có cooldown → Deactive node
                this._cooldownNode.active = false;
                console.log('[SkillButton]<_initializeUI> Cooldown node deactive (không có cooldown)');
            }
        }

        // 3. XỬ LÝ STACK NODE
        if (this._stackNode) {
            if (this._skill.maxStacks > 0) {
                // Có stacks → Active node và setup
                this._stackNode.active = true;
                this._currentStacks = this._skill.maxStacks; // Ban đầu full stacks

                if (this._stackLabel) {
                    this._stackLabel.string = `${this._currentStacks}/${this._skill.maxStacks}`;
                }
                console.log(`[SkillButton]<_initializeUI> Stack node active (maxStacks: ${this._skill.maxStacks})`);
            } else {
                // Không có stacks → Deactive node
                this._stackNode.active = false;
                console.log('[SkillButton]<_initializeUI> Stack node deactive (không có stacks)');
            }
        }

        console.log(`[SkillButton]<_initializeUI> UI initialized cho skill: ${this._skill.skillName}`);
    }
}
