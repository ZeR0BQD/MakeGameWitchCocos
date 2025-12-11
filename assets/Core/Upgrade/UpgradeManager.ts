import { _decorator, Component } from 'cc';
import { UIManager } from '../../UI/Script/UIManager';
import { IUISubscriber } from '../../UI/Script/IUISubscriber';
import { GameManager } from '../GameManager';
import { IUpgradeSubscriber } from './IUpgradeSubscriber';

const { ccclass } = _decorator;

@ccclass('UpgradeManager')
export class UpgradeManager extends Component implements IUISubscriber {
    private static _instance: UpgradeManager;

    public static get instance(): UpgradeManager {
        return UpgradeManager._instance;
    }

    private _upgradeSubscribers: Map<string, IUpgradeSubscriber[]> = new Map();

    protected onLoad(): void {
        if (!UpgradeManager._instance) {
            UpgradeManager._instance = this;
        } else {
            this.destroy();
        }
    }

    start() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.subscribe(this, 'LEVEL_UP_UPGRADE');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'LEVEL_UP_UPGRADE');
        }
    }

    public subscribe(subscriber: IUpgradeSubscriber, upgradeType: string): void {
        if (!this._upgradeSubscribers.has(upgradeType)) {
            this._upgradeSubscribers.set(upgradeType, []);
        }
        this._upgradeSubscribers.get(upgradeType).push(subscriber);
    }

    public unsubscribe(subscriber: IUpgradeSubscriber, upgradeType: string): void {
        if (this._upgradeSubscribers.has(upgradeType)) {
            const subscribers = this._upgradeSubscribers.get(upgradeType);
            const index = subscribers.indexOf(subscriber);
            if (index > -1) {
                subscribers.splice(index, 1);
            }
        }
    }

    public publish(upgradeType: string, data: any): void {
        if (this._upgradeSubscribers.has(upgradeType)) {
            this._upgradeSubscribers.get(upgradeType).forEach(subscriber => {
                subscriber.onUpgradeEvent(upgradeType, data);
            });
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'LEVEL_UP_UPGRADE') {
            this.showUpgradeUI(data.level);
        }
    }

    private showUpgradeUI(level: number): void {
    }

    public resumeGame(): void {
        const gameManager = GameManager.instance;
        if (gameManager) {
            gameManager.resumeGame();
        }
    }
}
