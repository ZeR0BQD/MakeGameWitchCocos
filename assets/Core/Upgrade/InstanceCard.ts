import { _decorator, Component, Prefab, Vec3, Node, director, UITransform } from 'cc';
import { ObjectPoolling } from '../ObjectPoolling';
import { UIManager } from '../../UI/Script/UIManager';
import { IUISubscriber } from '../../UI/Script/IUISubscriber';
import { CardUpgrade } from './CardUpgrade';
import { PlayerController } from '../../Player/Script/Core/PlayerController';
import { ConfigLoader } from '../Config/ConfigLoader';

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

    // Milestone caching
    private _currentMilestone: number = 0; // Cache milestone hiện tại

    protected onLoad(): void {


        this._cardPool = this.node.addComponent(ObjectPoolling);
        this._cardPool.poolSize = 3;

        if (!this.cardPrefab) {
            console.error("[InstanceCard] cardPrefab is NULL! Hãy assign Card Prefab trong Inspector!");
            return;
        }

        this._cardPool.init(this.cardPrefab);
        this._cardContainer = this.getOrCreateCardContainer();

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

        this.hideCards();

        if (!this._cardContainer) {
            console.error("[InstanceCard]<showCards> _cardContainer is NULL!");
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
     * Load drop rate config từ ConfigLoader's shared data
     */
    private _loadDropRateConfig(): void {
        // Kiểm tra ConfigLoader component có trên node không
        const configLoader = this.node.getComponent(ConfigLoader);
        if (!configLoader) {
            console.error('[InstanceCard] ConfigLoader component not found! Cần có ConfigLoader trên cùng node.');
            return;
        }

        // Lấy config data từ shared storage
        const configData = ConfigLoader.sharedConfigData;
        if (!configData) {
            console.warn('[InstanceCard] Config data chưa được load. ConfigLoader chưa load xong.');
            return;
        }

        // Lấy drop rate table từ config
        if (configData.cardUpgrade && configData.cardUpgrade.dropRateTable) {
            this._dropRateConfig = configData.cardUpgrade.dropRateTable;
        } else {
            console.error('[InstanceCard] Drop rate table not found in config!');
        }
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
     * Tìm level milestone gần nhất <= player level
     * VD: player level 3, milestones [2, 5, 8] return 2
     *     player level 7, milestones [2, 5, 8] return 5
     */
    private _findClosestMilestone(playerLevel: number): number {
        if (!this._dropRateConfig) {
            return 0;
        }

        // Lấy tất cả milestones và sort tăng dần
        const milestones = Object.keys(this._dropRateConfig)
            .map(key => parseInt(key))
            .sort((a, b) => a - b);

        if (milestones.length === 0) {
            return 0;
        }

        // Tìm milestone lớn nhất mà <= playerLevel
        let closestMilestone = milestones[0]; // Default: milestone đầu tiên

        for (const milestone of milestones) {
            if (playerLevel >= milestone) {
                closestMilestone = milestone;
            } else {
                break; // Đã qua playerLevel, dừng
            }
        }

        return closestMilestone;
    }

    /**
     * Random rarity dựa trên player level và drop rate table
     */
    private _randomRarity(playerLevel: number): string {
        if (!this._dropRateConfig) {
            return 'common';
        }

        // Kiểm tra nếu cần update milestone
        // Chỉ tính lại khi player level up qua milestone mới
        const newMilestone = this._findClosestMilestone(playerLevel);
        if (newMilestone !== this._currentMilestone) {
            this._currentMilestone = newMilestone;
        }

        // Lấy drop rate từ milestone hiện tại
        const dropRateKey = this._currentMilestone.toString();
        const dropRate = this._dropRateConfig[dropRateKey];

        if (!dropRate) {
            console.error(`[InstanceCard] Drop rate not found for milestone: ${dropRateKey}`);
            return 'common';
        }

        // Random dựa trên tỉ lệ
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
