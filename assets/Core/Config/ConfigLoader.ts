import { _decorator, JsonAsset, resources, Component } from 'cc';
import { IConfig } from './IConfig';

const { ccclass, property } = _decorator;

// Declare Editor và require cho TypeScript
declare const Editor: any;
declare const require: any;

/**
 * ConfigLoader - Component để load và apply config cho IConfig controller
 * Attach lên node cần load config (Player, Enemy, etc.)
 */
@ccclass('ConfigLoader')
export class ConfigLoader extends Component {

    private static _sharedConfigData: any = null;
    private static _sharedConfigAsset: JsonAsset = null;

    @property(JsonAsset)
    public configAsset: JsonAsset = null;

    @property(JsonAsset)
    public updateConfigAsset: JsonAsset = null;

    @property({
        tooltip: 'Tự động load và apply config khi start'
    })
    public autoLoadOnStart: boolean = true;

    protected onLoad(): void {
        if (this.autoLoadOnStart) {
            this.loadAndApplyConfig();
        }
    }

    /**
     * Load config từ JsonAsset và apply vào controller trên cùng node
     */
    public loadAndApplyConfig(): void {
        // Load config data từ asset
        this._loadConfigData();

        if (!ConfigLoader._sharedConfigData) {
            console.error('[ConfigLoader] Failed to load config data');
            return;
        }

        // Tìm controller trên cùng node này
        const controller = this._findConfigurableController();
        if (!controller) {
            console.warn(`[ConfigLoader] No IConfig controller found on node "${this.node.name}"`);
            return;
        }

        // Lấy configPath từ controller (REQUIRED)
        const configPath = controller.configPath;

        // Kiểm tra configPath có được set không
        if (!configPath || configPath === '') {
            console.error(`[ConfigLoader] configPath is REQUIRED but not set on component "${controller.constructor.name}"!`);
            console.error(`[ConfigLoader] Please add: public readonly configPath = "your/path/here";`);
            return;
        }

        // Lấy config data theo path
        const configData = this._getConfigByPath(ConfigLoader._sharedConfigData, configPath);
        if (!configData) {
            console.error(`[ConfigLoader] Config not found at path: "${configPath}"`);
            console.error(`[ConfigLoader] Available root keys:`, Object.keys(ConfigLoader._sharedConfigData));
            return;
        }

        // Apply config vào controller
        this._applyConfigToController(controller, configData);
    }

    /**
     * Load config data từ JsonAsset vào shared storage
     */
    private _loadConfigData(): void {
        // Nếu có configAsset mới, update shared data
        if (this.configAsset) {
            ConfigLoader._sharedConfigAsset = this.configAsset;
            ConfigLoader._sharedConfigData = this.configAsset.json;
        }

        // Nếu chưa có shared data, load từ resources
        if (!ConfigLoader._sharedConfigData) {
            // Fallback: load từ default path
            this._loadFromResources("database/configs/game_config");
        }
    }

    /**
     * Load config từ resources path (sync fallback)
     */
    private _loadFromResources(path: string): void {
        resources.load(path, JsonAsset, (err, jsonAsset: JsonAsset) => {
            if (err) {
                console.error(`[ConfigLoader] Failed to load config from "${path}":`, err);
                return;
            }
            ConfigLoader._sharedConfigAsset = jsonAsset;
            ConfigLoader._sharedConfigData = jsonAsset.json;
        });
    }

    /**
     * Tìm IConfig controller trên CÙNG node này
     */
    private _findConfigurableController(): IConfig | null {
        const components = this.node.getComponents(Component);

        for (const comp of components) {
            // Check nếu component có _keyToVariable property (implement IConfig)
            if ('_keyToVariable' in comp) {
                return comp as unknown as IConfig;
            }
        }

        return null;
    }

    /**
     * Lấy config data theo path (hỗ trợ nested path với delimiter '/')
     * Path REQUIRED - không hỗ trợ auto-detect
     */
    private _getConfigByPath(configData: any, path: string): any {
        // Path rỗng → return null (không auto-detect)
        if (!path || path === '') {
            console.error(`[ConfigLoader]<_getConfigByPath> Path is required!`);
            return null;
        }

        // Xử lý path với delimiter '/'
        const keys = path.split('/');
        let current = configData;

        for (const key of keys) {
            if (!current || !current.hasOwnProperty(key)) {
                return null;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Apply config data vào controller thông qua IConfig interface
     */
    private _applyConfigToController(controller: IConfig, configData: any): void {
        const keyMapping = controller._keyToVariable;
        const validKeys = Object.keys(keyMapping);
        for (const key of validKeys) {
            if (configData.hasOwnProperty(key)) {
                const variableName = keyMapping[key];
                const value = configData[key];

                (controller as any)[variableName] = value;
            }
        }
    }

    /**
     * Clear shared config data
     */
    public static clearSharedConfig(): void {
        ConfigLoader._sharedConfigData = null;
        ConfigLoader._sharedConfigAsset = null;
    }
}
