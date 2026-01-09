import { _decorator, Component, Node } from 'cc';
import { SkillButton } from './SkillButton';
import { UIManager } from 'db://assets/UI/Script/UIManager';
import { IUISubscriber } from 'db://assets/UI/Script/IUISubscriber';

const { ccclass, property } = _decorator;

/**
 * Component quản lý skill menu UI
 * EVENT-DRIVEN: Subscribe vào 'skill-added' event từ SkillsManager
 * Track active skills và auto-assign vào empty slots
 */
@ccclass('SkillMenu')
export class SkillMenu extends Component implements IUISubscriber {
    // Array of skill button nodes
    @property({ type: [Node], tooltip: 'Array of skill button nodes (drag từ Editor)' })
    public skillButtons: Node[] = [];

    // Track active skills và vị trí của chúng
    private _activeSkills: string[] = [];  // Index = button slot, Value = skillName

    onLoad() {
        // Initialize array với empty slots
        this._activeSkills = new Array(this.skillButtons.length).fill(null);
    }

    start() {
        // Subscribe TRONG START - UIManager singleton đã ready
        const uiManager = UIManager.getInstance();
        if (!uiManager) {
            console.error('[SkillMenu]<start> UIManager instance is NULL! Cannot subscribe');
            return;
        }

        uiManager.subscribe(this, 'skill-added');
        console.log(`[SkillMenu]<start> Subscribed to skill-added events, ${this.skillButtons.length} slots available`);
    }

    onDestroy() {
        // Unsubscribe khi destroy
        UIManager.getInstance()?.unsubscribe(this, 'skill-added');
    }

    /**
     * IUISubscriber implementation
     * Nhận events từ UIManager
     */
    public onUIEvent(eventType: string, data: any): void {
        console.log(`[SkillMenu]<onUIEvent> Received event: ${eventType}, data:`, data);

        if (eventType === 'skill-added') {
            this._onSkillAdded(data.skillName);
        }
    }

    /**
     * Handler khi có skill mới được add
     * EVENT-DRIVEN - Chỉ gọi khi có skill thật sự được thêm
     */
    private _onSkillAdded(skillName: string): void {
        console.log(`[SkillMenu]<_onSkillAdded> Skill added: ${skillName}`);

        // Check nếu đã có skill này rồi
        if (this._activeSkills.includes(skillName)) {
            console.log(`[SkillMenu]<_onSkillAdded> Skill ${skillName} đã có, bỏ qua`);
            return;
        }

        // Tìm slot trống để gán
        const emptySlotIndex = this._findEmptySlot();
        if (emptySlotIndex === -1) {
            console.warn('[SkillMenu]<_onSkillAdded> Không còn slot trống! Cần implement replacement logic');
            // TODO: Future - implement logic để replace skill cũ
            return;
        }

        // Add vào tracking array
        this._activeSkills[emptySlotIndex] = skillName;

        // Gán cho button
        this._assignSkillToButton(skillName, emptySlotIndex);

        console.log(`[SkillMenu]<_onSkillAdded> Assigned ${skillName} to slot ${emptySlotIndex}`);
        console.log(`[SkillMenu]<_onSkillAdded> Active skills:`, this._activeSkills);
    }

    /**
     * Tìm slot trống đầu tiên
     */
    private _findEmptySlot(): number {
        console.log(`[SkillMenu]<_findEmptySlot> Current _activeSkills:`, this._activeSkills);

        for (let i = 0; i < this._activeSkills.length; i++) {
            console.log(`[SkillMenu]<_findEmptySlot> Checking slot ${i}: ${this._activeSkills[i]}`);
            if (!this._activeSkills[i]) {
                console.log(`[SkillMenu]<_findEmptySlot> Found empty slot: ${i}`);
                return i;
            }
        }

        console.log('[SkillMenu]<_findEmptySlot> No empty slot found');
        return -1;  // Không còn slot trống
    }

    /**
     * Gán skill cho button tại index cụ thể
     */
    private _assignSkillToButton(skillName: string, buttonIndex: number): void {
        if (buttonIndex < 0 || buttonIndex >= this.skillButtons.length) {
            console.error(`[SkillMenu]<_assignSkillToButton> Invalid button index: ${buttonIndex}`);
            return;
        }

        const buttonNode = this.skillButtons[buttonIndex];
        if (!buttonNode) {
            console.error(`[SkillMenu]<_assignSkillToButton> Button node at index ${buttonIndex} is null`);
            return;
        }

        const skillButton = buttonNode.getComponent(SkillButton);
        if (!skillButton) {
            console.error(`[SkillMenu]<_assignSkillToButton> Button node doesn't have SkillButton component`);
            return;
        }

        // INJECT skillName vào SkillButton
        skillButton.setSkillName(skillName);
        console.log(`[SkillMenu]<_assignSkillToButton> Injected ${skillName} into button ${buttonIndex}`);
    }
}