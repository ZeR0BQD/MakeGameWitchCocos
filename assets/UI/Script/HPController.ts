import { _decorator, Component, ProgressBar } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('HPController')
export class HPController extends Component implements IUISubscriber {
    @property({ type: ProgressBar, tooltip: 'HP Progress Bar' })
    private hpBar: ProgressBar = null;

    start() {
        const uiManager = UIManager.getInstance();

        if (uiManager) {
            uiManager.subscribe(this, 'HP_CHANGED');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'HP_CHANGED');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'HP_CHANGED') {
            this._updateHP(data);
        }
    }

    private _updateHP(data: any): void {
        if (this.hpBar) {
            this.hpBar.progress = data.percent;
        }

        this._checkHPEffects(data.percent);
    }

    private _checkHPEffects(percent: number): void {
        if (percent < 0.3) {
        }
    }
}
