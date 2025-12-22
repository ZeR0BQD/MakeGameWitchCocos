import { _decorator, Component, Button, Sprite } from 'cc'; decodeURIComponent
import { InstanceCard } from './InstanceCard';
import { UpgradeManager } from './UpgradeManager';
import { IConfig } from 'db://assets/Core/Config/IConfig';
import { PlayerController } from '../../Player/Script/Core/PlayerController';
import { ConfigLoader } from '../Config/ConfigLoader';

const { ccclass } = _decorator;

@ccclass('CardUpgrade')
export class CardUpgrade extends Component implements IConfig {
    // IConfig implementation 
    readonly _keyToVariable: Record<string, string> = {
        "maxHP": "_maxHP",
        "maxEXP": "_maxEXP",
        "speed": "_speed"
    };

    // Card upgrade stats sẽ được load từ config
    private _maxHP: number = 0;
    private _maxEXP: number = 0;
    private _speed: number = 0;

    // Dynamic card data (injected từ InstanceCard thông qua setCardData)
    private _cardType: string = ""; // "cardUpgradeHP", "cardUpgradeEXP", "cardUpgradeSpeed"
    private _rarity: string = ""; // "common", "rare", "epic"

    public get configPath(): string {
        if (!this._cardType || !this._rarity) {
            return "";
        }
        return `cardUpgrade/${this._cardType}/${this._rarity}`;
    }

    private _instanceCard: InstanceCard;

    protected onLoad(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.on(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    protected start(): void {
        if (!this._cardType || !this._rarity) {
            console.error("[CardUpgrade] cardType and rarity are required! Call setCardData() first.");
            return;
        }
    }

    public setInstanceCard(instanceCard: InstanceCard): void {
        this._instanceCard = instanceCard;
    }

    /**
     * Set card data từ InstanceCard
     */
    public setCardData(cardType: string, rarity: string): void {
        this._cardType = cardType;
        this._rarity = rarity;

        // Load config sau khi có đủ data
        this._loadConfig();
    }

    /**
     * Load config từ ConfigLoader
     */
    private _loadConfig(): void {
        const configLoader = this.getComponent(ConfigLoader);
        if (configLoader) {
            configLoader.loadAndApplyConfig();
        }
    }



    onDestroy(): void {
        const button = this.getComponent(Button);
        if (button) {
            button.node.off(Button.EventType.CLICK, this.onCardClick, this);
        }
    }

    private onCardClick(): void {

        const sprite = this.getComponent(Sprite);

        this._applyUpgradeToPlayer();

        if (this._instanceCard) {
            this._instanceCard.hideCards();
        }

        const upgradeManager = UpgradeManager.instance;
        if (upgradeManager) {
            upgradeManager.resumeGame();
        }
    }

    /**
     * Apply upgrade stats lên PlayerController
     */
    private _applyUpgradeToPlayer(): void {
        const player = PlayerController._instance;
        if (!player) {
            console.error('[CardUpgrade]<_applyUpgradeToPlayer> PlayerController not found!');
            return;
        }

        // Apply từng stat nếu có giá trị
        if (this._maxHP !== 0) {
            player.applyUpgrade({ type: 'MAX_HEALTH', value: this._maxHP });
        }

        if (this._maxEXP !== 0) {
            player.applyUpgrade({ type: 'MAX_EXP', value: this._maxEXP });
        }

        if (this._speed !== 0) {
            player.applyUpgrade({ type: 'SPEED', value: this._speed });
        }
    }
}