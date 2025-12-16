import { _decorator, Component } from 'cc';
import { IUISubscriber } from './IUISubscriber';

const { ccclass } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    private static _instance: UIManager = null;

    public static getInstance(): UIManager {
        return UIManager._instance;
    }

    private _subscriberMap: Map<string, IUISubscriber[]> = new Map();

    onLoad() {
        if (UIManager._instance && UIManager._instance !== this) {
            this.node.destroy();
            return;
        }

        UIManager._instance = this;
    }

    onDestroy() {
        if (UIManager._instance === this) {
            UIManager._instance = null;
        }
    }

    public subscribe(subscriber: IUISubscriber, eventType: string): void {
        if (!this._subscriberMap.has(eventType)) {
            this._subscriberMap.set(eventType, []);
        }

        const subscribers = this._subscriberMap.get(eventType);

        if (subscribers.indexOf(subscriber) !== -1) {
            return;
        }

        subscribers.push(subscriber);
    }

    public unsubscribe(subscriber: IUISubscriber, eventType: string): void {
        if (!this._subscriberMap.has(eventType)) {
            return;
        }

        const subscribers = this._subscriberMap.get(eventType);
        const index = subscribers.indexOf(subscriber);

        if (index !== -1) {
            subscribers.splice(index, 1);
        }
    }

    public publish(eventType: string, data: any): void {
        const subscribers = this._subscriberMap.get(eventType);

        if (!subscribers || subscribers.length === 0) {
            return;
        }

        for (const subscriber of subscribers) {
            try {
                subscriber.onUIEvent(eventType, data);
            } catch (error) {
                console.error(error);
            }
        }
    }

    public logSubscribers(): void {
        // Debug method - empty
    }
}
