import { _decorator, Component, Button } from 'cc';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';
import { InstanceCard } from './InstanceCard';
import { UpgradeManager } from './UpgradeManager';

const { ccclass } = _decorator;

@ccclass('CardUpgrade')
export class CardUpgrade extends Component {
    private _instanceCard: InstanceCard = null;

    protected onLoad(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.on(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    onDestroy(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.off(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    public setInstanceCard(instanceCard: InstanceCard): void {
        this._instanceCard = instanceCard;
    }

    private onCardClick(): void {
        this.applyUpgrade();

        if (this._instanceCard) {
            this._instanceCard.hideCards();
        }

        const upgradeManager = UpgradeManager.instance;
        if (upgradeManager) {
            upgradeManager.resumeGame();
        }
    }

    protected prepareUpgradeData(): { type: string, value: number } {
        return {
            type: 'MAX_HEALTH',
            value: 20
        };
    }

    private applyUpgrade(): void {
        const player = PlayerController.playerInstance;
        if (!player) {
            return;
        }

        const upgradeData = this.prepareUpgradeData();
        player.applyUpgrade(upgradeData);
        console.log('Upgrade applied:', upgradeData, "Player HP", player.maxHP);
    }
}
