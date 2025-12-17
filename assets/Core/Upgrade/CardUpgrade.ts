import { _decorator, Component, Button } from 'cc';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';
import { InstanceCard } from './InstanceCard';
import { UpgradeManager } from './UpgradeManager';
import { IConfig } from 'db://assets/Core/Config/IConfig';

const { ccclass } = _decorator;

@ccclass('CardUpgrade')
export class CardUpgrade extends Component implements IConfig {
    // IConfig implementation 
    readonly _keyToVariable: Record<string, string> = {
        "maxHP": "_maxHP",
        "maxEXP": "_maxEXP",
        "speed": "_speed"
    };

    public pathUpgrade: string = "upgradeBaseStats/cardUpgradeLv1";

    public get configPath(): string {
        return `cardUpgrade/${this.pathUpgrade}`;
    }

    // Card upgrade stats sẽ được load từ config
    private _maxHP: number = 0;
    private _maxEXP: number = 0;
    private _speed: number = 0;

    private _instanceCard: InstanceCard = null;

    protected onLoad(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.on(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    public setInstanceCard(instanceCard: InstanceCard): void {
        this._instanceCard = instanceCard;
    }

    protected start(): void {
        // Config loaded via ConfigLoader
    }

    onDestroy(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.off(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    private onCardClick(): void {
        // TODO: Implement logic với ConfigLoader

        if (this._instanceCard) {
            this._instanceCard.hideCards();
        }

        const upgradeManager = UpgradeManager.instance;
        if (upgradeManager) {
            upgradeManager.resumeGame();
        }
    }
}