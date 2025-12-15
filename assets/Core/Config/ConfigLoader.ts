import { _decorator, JsonAsset, resources, Component } from 'cc';
import { IConfigurable } from './IConfigurable';

const { ccclass, property } = _decorator;

// Declare Editor và require cho TypeScript
declare const Editor: any;
declare const require: any;

/**
 * ConfigLoader - Component để load và apply config cho IConfigurable controller
 * Attach lên node cần load config (Player, Enemy, etc.)
 */
@ccclass('ConfigLoader')
export class ConfigLoader extends Component {

    private static _sharedConfigData: any = null;
    private static _sharedConfigAsset: JsonAsset = null;

    @property({
        type: JsonAsset,
        visible: true,
        serializable: true,
        tooltip: 'JSON Asset chứa config data (share cho tất cả ConfigLoader)'
    })
    public configAsset: JsonAsset | null = null;

    @property({
        type: JsonAsset,
        visible: true,
        serializable: true,
        tooltip: 'JSON Asset chứa partial config để update (merge vào config chính)'
    })
    public updateConfigAsset: JsonAsset | null = null;

    @property({
        tooltip: 'Path đến config trong JSON file (VD: "player", "enemy/squid")'
    })
    public configPath: string = '';

    @property({
        tooltip: 'Tự động load và apply config khi start'
    })
    public autoLoadOnStart: boolean = true;

    protected start(): void {
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
            console.warn(`[ConfigLoader] No IConfigurable controller found on node "${this.node.name}"`);
            return;
        }

        // Lấy config theo configPath
        const configData = this._getConfigByPath(ConfigLoader._sharedConfigData, this.configPath);
        if (!configData) {
            console.warn(`[ConfigLoader] Config not found at path: "${this.configPath}"`);
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
     * Tìm IConfigurable controller trên CÙNG node này
     */
    private _findConfigurableController(): IConfigurable | null {
        const components = this.node.getComponents(Component);

        for (const comp of components) {
            // Check nếu component có _keyToVariable property (implement IConfigurable)
            if ('_keyToVariable' in comp) {
                return comp as unknown as IConfigurable;
            }
        }

        return null;
    }

    /**
     * Lấy config data theo path (hỗ trợ nested path với delimiter '/')
     */
    private _getConfigByPath(configData: any, path: string): any {
        if (!path || path === '') {
            return configData;
        }

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
     * Apply config data vào controller thông qua IConfigurable interface
     */
    private _applyConfigToController(controller: IConfigurable, configData: any): void {
        const keyMapping = controller._keyToVariable;
        const validKeys = Object.keys(keyMapping);

        let setCount = 0;
        for (const key of validKeys) {
            if (configData.hasOwnProperty(key)) {
                const variableName = keyMapping[key];
                const value = configData[key];

                (controller as any)[variableName] = value;
                setCount++;
            }
        }


    }

    /**
     * Lấy config value theo path (public API cho external usage)
     */
    public static getConfigValue(path: string): any {
        if (!ConfigLoader._sharedConfigData) {
            console.warn('[ConfigLoader] Config data not loaded yet');
            return null;
        }

        const keys = path.split('/');
        let current = ConfigLoader._sharedConfigData;

        for (const key of keys) {
            if (!current || !current.hasOwnProperty(key)) {
                return null;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Update config bằng cách merge updateConfigAsset vào configAsset FILE
     * Merge changes và SAVE trở lại file game_config.json
     * ASYNC - Đợi file operations hoàn thành
     */
    public async updateConfig(): Promise<void> {
        console.log('[ConfigLoader] ========== updateConfig() START ==========');
        console.log('[ConfigLoader] this.updateConfigAsset:', this.updateConfigAsset);
        console.log('[ConfigLoader] this.configAsset:', this.configAsset);

        if (!this.updateConfigAsset) {
            console.error('[ConfigLoader] ❌ updateConfigAsset is NULL - Assign update.json in Inspector!');
            return;
        }

        if (!this.configAsset) {
            console.error('[ConfigLoader] ❌ configAsset is NULL - Assign game_config.json in Inspector!');
            return;
        }

        console.log('[ConfigLoader] ✓ Both assets assigned, proceeding...');

        const updateData = this.updateConfigAsset.json;
        const baseData = this.configAsset.json;

        console.log('[ConfigLoader] === Before Merge ===');
        console.log('[ConfigLoader] baseData:', JSON.stringify(baseData, null, 2));
        console.log('[ConfigLoader] updateData:', JSON.stringify(updateData, null, 2));

        // Deep merge update data vào base config
        this._deepMerge(baseData, updateData);

        console.log('[ConfigLoader] === After Merge ===');
        console.log('[ConfigLoader] baseData (merged):', JSON.stringify(baseData, null, 2));

        // Save trở lại file (AWAIT)
        console.log('[ConfigLoader] Calling _saveConfigToFile()...');
        await this._saveConfigToFile(baseData);

        console.log('[ConfigLoader] ========== updateConfig() COMPLETE ==========');
    }

    /**
     * Save config data trở lại file JSON
     * ASYNC - Đợi file write operations
     */
    private async _saveConfigToFile(configData: any): Promise<void> {
        console.log('[ConfigLoader] _saveConfigToFile() called');
        console.log('[ConfigLoader] typeof Editor:', typeof Editor);

        // Check nếu đang chạy trong Editor
        if (typeof Editor === 'undefined') {
            console.error('[ConfigLoader] ❌ Editor is undefined - Must run in Cocos Creator Editor!');
            throw new Error('Save only works in Editor mode');
        }

        console.log('[ConfigLoader] ✓ Editor detected');

        const uuid = (this.configAsset as any)._uuid;
        console.log('[ConfigLoader] Asset UUID:', uuid);

        console.log('[ConfigLoader] Requesting asset info from Editor...');

        try {
            // AWAIT asset info request
            const assetInfo: any = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            console.log('[ConfigLoader] Asset info received:', assetInfo);

            if (!assetInfo || !assetInfo.source) {
                throw new Error('Cannot get asset file path');
            }

            let filePath = assetInfo.source;
            console.log('[ConfigLoader] Original file path:', filePath);

            // Convert db:// path sang absolute path
            if (filePath.startsWith('db:/')) {
                const path = require('path');
                const relativePath = filePath.substring(4).replace(/\//g, path.sep);
                filePath = path.join(Editor.Project.path, relativePath);
                console.log('[ConfigLoader] Converted to absolute path:', filePath);
            }

            // Save JSON với format đẹp
            const jsonString = JSON.stringify(configData, null, 4);
            console.log('[ConfigLoader] JSON string length:', jsonString.length);

            const fs = require('fs');
            console.log('[ConfigLoader] Writing file...');

            // Synchronous write (fs.writeFileSync) - faster for small files
            fs.writeFileSync(filePath, jsonString, 'utf-8');

            console.log(`[ConfigLoader] ✓✓✓ SAVED SUCCESSFULLY to: ${filePath}`);

            // Refresh asset database
            console.log('[ConfigLoader] Refreshing asset database...');
            await Editor.Message.request('asset-db', 'refresh-asset', uuid);

            // Update shared data
            ConfigLoader._sharedConfigData = configData;
            console.log('[ConfigLoader] Updated shared config data');

            // Re-apply config (only if game is running)
            if (this.isValid) {
                console.log('[ConfigLoader] Re-applying config to controller...');
                this.loadAndApplyConfig();
            } else {
                console.log('[ConfigLoader] Game not running, skip re-apply');
            }

            console.log('[ConfigLoader] ========== SAVE COMPLETE ==========');

        } catch (err: any) {
            console.error('[ConfigLoader] ❌❌❌ SAVE FAILED:', err);
            console.error('[ConfigLoader] Error message:', err.message);
            console.error('[ConfigLoader] Error stack:', err.stack);
            throw err;
        }
    }

    /**
     * Deep merge source vào target
     * Chỉ override những key có trong source, giữ nguyên các key khác trong target
     */
    private _deepMerge(target: any, source: any): void {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    // Nếu là object và chưa tồn tại trong target → tạo mới
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    // Đệ quy merge vào object con
                    this._deepMerge(target[key], source[key]);
                } else {
                    // Primitive value hoặc array → ghi đè trực tiếp
                    target[key] = source[key];
                }
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
