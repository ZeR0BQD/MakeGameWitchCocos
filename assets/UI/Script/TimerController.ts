import { _decorator, Component, Label, Node } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

@ccclass('TimerController')
export class TimerController extends Component {
    public static _instance: TimerController;
    public _maxTime: number = 60;
    public _currentTime: number = 60;
    protected _timeLabel: Label;

    protected onLoad(): void {
        if (TimerController._instance) {
            TimerController._instance.destroy();
        }
        TimerController._instance = this;

        this._currentTime = this._maxTime;

        this._timeLabel = this.node.getChildByName('Timer').getComponent(Label);
        this._timeLabel.string = this._currentTime.toString();
    }

    start() {
        this.schedule(this.countdown, 1.0);
    }
    private countdown(): void {
        if (this._currentTime > 0) {
            this._currentTime -= 1;
            this._timeLabel.string = this._currentTime.toString();
            if (this._currentTime <= 0) {
                this.unschedule(this.countdown);
            }
        }
    }

    protected onDestroy(): void {
        this.unschedule(this.countdown);
    }
}


