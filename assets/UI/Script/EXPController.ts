import { _decorator, Component, ProgressBar } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('EXPController')
export class EXPController extends Component implements IUISubscriber {
    @property({ type: ProgressBar, tooltip: 'EXP Progress Bar' })
    private expBar: ProgressBar = null;

    private _lastLevel: number = 1;

    start() {
        const uiManager = UIManager.getInstance();

        if (uiManager) {
            uiManager.subscribe(this, 'EXP_CHANGED');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'EXP_CHANGED');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'EXP_CHANGED') {
            this._updateEXP(data);
        }
    }

    private _updateEXP(data: any): void {
        if (this.expBar) {
            this.expBar.progress = data.percent;
        }

        if (data.level > this._lastLevel) {
            this._onLevelUp(data.level);
            this._lastLevel = data.level;
        }
    }

    private _onLevelUp(newLevel: number): void {
    }
}
