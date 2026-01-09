import { _decorator, Component, director, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager;

    public static get instance(): GameManager {
        return GameManager._instance;
    }

    private _gameLoopNode: Node = null;
    private _canvas: Node = null;

    protected onLoad(): void {
        if (!GameManager._instance) {
            GameManager._instance = this;
        } else {
            this.destroy();
        }

        const scene = director.getScene();
        this._gameLoopNode = scene.getChildByName('GameLoop');
        this._canvas = scene.getChildByName('Canvas');
    }

    public pauseGame(): void {
        if (this._gameLoopNode) {
            this._gameLoopNode.active = false;
        }
        // if (this._canvas) {
        //     // Tắt tất cả UI trừ UpgradeManager
        //     this._canvas.children.forEach(child => {
        //         if (child.name !== 'UpgradeManager') {
        //             child.active = false;
        //         }
        //     });
        // }
    }

    public resumeGame(): void {
        if (this._gameLoopNode) {
            this._gameLoopNode.active = true;
        }
        // if (this._canvas) {
        //     this._canvas.children.forEach(child => {
        //         child.active = true;
        //     });
        // }
    }
}
