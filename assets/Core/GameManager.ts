import { _decorator, Component, director, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager;

    public static get instance(): GameManager {
        return GameManager._instance;
    }

    private _gameLoopNode: Node = null;

    protected onLoad(): void {
        if (!GameManager._instance) {
            GameManager._instance = this;
        } else {
            this.destroy();
        }

        const scene = director.getScene();
        this._gameLoopNode = scene.getChildByName('GameLoop');
    }

    public pauseGame(): void {
        if (this._gameLoopNode) {
            this._gameLoopNode.active = false;
        }
    }

    public resumeGame(): void {
        if (this._gameLoopNode) {
            this._gameLoopNode.active = true;
        }
    }
}
