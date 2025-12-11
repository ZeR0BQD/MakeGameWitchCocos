import { _decorator, Component, Prefab, Vec3, Node, director, UITransform } from 'cc';
import { ObjectPoolling } from '../ObjectPoolling';
import { UIManager } from '../../UI/Script/UIManager';
import { IUISubscriber } from '../../UI/Script/IUISubscriber';
import { CardUpgrade } from './CardUpgrade';

const { ccclass, property } = _decorator;

@ccclass('InstanceCard')
export class InstanceCard extends Component implements IUISubscriber {
    @property({ type: Prefab })
    private cardPrefab: Prefab = null;
    private _cardPool: ObjectPoolling = null;
    private _activeCards: Node[] = [];
    private _cardContainer: Node = null;

    protected onLoad(): void {
        this._cardPool = this.node.addComponent(ObjectPoolling);
        this._cardPool.poolSize = 3;

        if (!this.cardPrefab) {
            return;
        }

        this._cardPool.init(this.cardPrefab);
        this._cardContainer = this.getOrCreateCardContainer();
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
        let uiNode = scene.getChildByName('UI');

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
        if (eventType === 'LEVEL_UP_UPGRADE') {
            this.showCards();
        }
    }

    public showCards(): void {
        this.hideCards();

        if (!this._cardContainer) {
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
                }

                this._activeCards.push(card);
            }
        }
    }

    public hideCards(): void {
        this._activeCards.forEach(card => {
            this._cardPool.returnObject(card);
        });
        this._activeCards = [];
    }
}
