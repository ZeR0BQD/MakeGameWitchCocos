import { _decorator, Component, Prefab, Vec3, Node, director, UITransform, JsonAsset, resources } from 'cc';
import { ObjectPoolling } from '../ObjectPoolling';
import { UIManager } from '../../UI/Script/UIManager';
import { IUISubscriber } from '../../UI/Script/IUISubscriber';
import { CardUpgrade } from './CardUpgrade';
import { PlayerController } from '../../Player/Script/Core/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('InstanceCard')
export class InstanceCard extends Component implements IUISubscriber {
    @property({ type: Prefab })
    private cardPrefab: Prefab = null;

    private _cardPool: ObjectPoolling = null;
    private _activeCards: Node[] = [];
    private _cardContainer: Node = null;

    // Drop rate config
    private _dropRateConfig: any = null;
    private _cardTypes: string[] = ['cardUpgradeHP', 'cardUpgradeEXP', 'cardUpgradeSpeed'];

    protected onLoad(): void {
        console.log("[InstanceCard] onLoad - cardPrefab:", this.cardPrefab);

        this._cardPool = this.node.addComponent(ObjectPoolling);
        this._cardPool.poolSize = 3;

        if (!this.cardPrefab) {
            console.error("[InstanceCard] cardPrefab is NULL! Hãy assign Card Prefab trong Inspector!");
            return;
        }

        this._cardPool.init(this.cardPrefab);
        this._cardContainer = this.getOrCreateCardContainer();

        console.log("[InstanceCard] Container created:", this._cardContainer);

        // Load drop rate config
        this._loadDropRateConfig();
    }

    start(): void {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.subscribe(this, 'LEVEL_UP_UPGRADE');
        }
    }

    onDestroy(): void {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'LEVEL_UP_UPGRADE');
        }
    }

    private getOrCreateCardContainer(): Node {
        const scene = director.getScene();
        let uiNode = scene.getChildByName('Canvas');

        if (!uiNode) {
            return null;
        }

        let cardUpgradeNode = uiNode.getChildByName('UICardUpgrade');
        if (!cardUpgradeNode) {
            cardUpgradeNode = new Node('UICardUpgrade');
            cardUpgradeNode.parent = uiNode;
        }

        return cardUpgradeNode;
    }

    public onUIEvent(eventType: string, data: any): void {
        console.log("[InstanceCard] Event received:", eventType, data);

        if (eventType === 'LEVEL_UP_UPGRADE') {
            this.showCards();
        }
    }

    public showCards(): void {
        console.log("[InstanceCard] showCards() called!");

        this.hideCards();

        if (!this._cardContainer) {
            console.error("[InstanceCard] _cardContainer is NULL!");
            return;
        }

        const uiNode = this._cardContainer.parent;
        if (!uiNode) {
            return;
        }

        const uiTransform = uiNode.getComponent(UITransform);
        if (!uiTransform) {
            return;
        }

        const uiWidth = uiTransform.width;
        const uiHeight = uiTransform.height;

        const cardSpacing = uiWidth / 4;
        const startX = -uiWidth / 2 + cardSpacing;
        const yPosition = -uiHeight / 2 + 320;

        for (let i = 0; i < 3; i++) {
            const xPosition = startX + (i * cardSpacing);
            const cardPosition = new Vec3(xPosition, yPosition, 0);

            const card = this._cardPool.getObject();
            console.log("[InstanceCard] Card from pool:", card);

            if (card) {
                card.parent = this._cardContainer;
                card.setPosition(cardPosition);

                const cardUpgrade = card.getComponent(CardUpgrade);
                if (cardUpgrade) {
                    cardUpgrade.setInstanceCard(this);

                    // Random card data dựa trên player level
                    const playerLevel = this._getPlayerLevel();
                    const cardType = this._randomCardType();
                    const rarity = this._randomRarity(playerLevel);

                    // Inject data vào card
                    cardUpgrade.setCardData(cardType, rarity);
                }

                this._activeCards.push(card);
            }
        }
    }

    /**
     * Load drop rate config từ game_config
     */
    private _loadDropRateConfig(): void {
        resources.load("database/configs/game_config", JsonAsset, (err, jsonAsset: JsonAsset) => {
            if (err) {
                return;
            }

            const configData = jsonAsset.json;
            if (configData && configData.cardUpgrade && configData.cardUpgrade.dropRateTable) {
                this._dropRateConfig = configData.cardUpgrade.dropRateTable;
            }
        });
    }

    /**
     * Lấy player level hiện tại
     */
    private _getPlayerLevel(): number {
        const player = PlayerController._instance;
        if (player) {
            return player.level;
        }
        return 1; // Default level
    }

    /**
     * Random loại card (HP, EXP, Speed)
     */
    private _randomCardType(): string {
        const randomIndex = Math.floor(Math.random() * this._cardTypes.length);
        return this._cardTypes[randomIndex];
    }

    /**
     * Random rarity dựa trên player level và drop rate table
     */
    private _randomRarity(playerLevel: number): string {
        if (!this._dropRateConfig) {
            return 'common';
        }

        // Xác định level range
        let dropRateKey = 'level_1_2';
        if (playerLevel <= 2) {
            dropRateKey = 'level_1_2';
        } else if (playerLevel <= 4) {
            dropRateKey = 'level_3_4';
        } else if (playerLevel <= 6) {
            dropRateKey = 'level_5_6';
        } else if (playerLevel <= 8) {
            dropRateKey = 'level_7_8';
        } else {
            dropRateKey = 'level_9_plus';
        }

        const dropRate = this._dropRateConfig[dropRateKey];
        if (!dropRate) {
            return 'common';
        }

        // Weighted random dựa trên tỉ lệ
        const rand = Math.random() * 100;
        let cumulative = 0;

        for (const rarity of ['common', 'rare', 'epic']) {
            cumulative += dropRate[rarity];
            if (rand <= cumulative) {
                return rarity;
            }
        }

        return 'common'; // Fallback
    }

    public hideCards(): void {
        this._activeCards.forEach(card => {
            this._cardPool.returnObject(card);
        });
        this._activeCards = [];
    }
}
