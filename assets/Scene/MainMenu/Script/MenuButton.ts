import { _decorator, Component, instantiate, JsonAsset, Prefab, resources, game, director } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';
import { LoadNewScene } from 'db://assets/Scene/LoadingScene/Script/LoadNewScene';
const { ccclass, property } = _decorator;

/**
 * MenuButton - Main Menu Controller
 */
@ccclass('MenuButton')
export class MenuButton extends Component {


    protected start(): void {
        resources.load('database/configs/game_config', JsonAsset, (err, jsonAsset) => {
            if (err) {
                console.error('[MenuButton] Failed to load config:', err);
                return;
            }
            ConfigLoader.sharedConfigData = jsonAsset.json;
            console.log('[MenuButton] Config loaded successfully');
        });
    }

    buttonPlay(): void {
        console.log("Button play clicked");
        if (!ConfigLoader.sharedConfigData) {
            console.warn('[MenuButton] Config not loaded yet!');
            return;
        }

        resources.load('Scene/LoadScene/LoadScene', Prefab, (err, prefab) => {
            if (err) {
                console.error('[MenuButton] Failed to load LoadScene prefab:', err);
                return;
            }

            const overlayNode = instantiate(prefab);
            const loadSceneComp = overlayNode.getComponent(LoadNewScene);
            loadSceneComp._setSceneName = "MainScene";

            // Add vào root level của scene (cấp cao nhất)
            director.getScene().addChild(overlayNode);
        });
    }

    buttonQuit(): void {
        console.log("[MenuButton] Button quit clicked");
        // game.end();
    }
}
