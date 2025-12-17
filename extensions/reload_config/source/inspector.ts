'use strict';

// Removed invalid import. relying on global types or 'any' for simplicity in this script context.
// import { IPanelThis } from "@cocos/creator-types/editor"; 

// Declare require to fix TS error since @types/node might not be included in tsconfig types list
declare const require: any;
declare const Editor: any;

const path = require('path');
const fs = require('fs');

type Selector<$> = { $: Record<keyof $, any | null> }

export const template = `
<ui-prop type="dump" id="config-asset-prop"></ui-prop>
<ui-prop type="dump" id="update-asset-prop"></ui-prop>

<ui-prop>
    <ui-label slot="label">Actions</ui-label>
    <div slot="content" style="display: flex; flex-direction: column; gap: 5px;">
        <div style="display: flex; gap: 5px;">
            <ui-button id="clear-btn">
                <ui-icon value="trash"></ui-icon>
                Clear
            </ui-button>
            <ui-button class="blue" id="load-btn">
                <ui-icon value="download"></ui-icon>
                Load
            </ui-button>
        </div>
        <div style="display: flex; gap: 5px;">
            <ui-button class="orange" id="update-btn" style="flex: 1;">
                <ui-icon value="refresh"></ui-icon>
                Update & Save
            </ui-button>
        </div>
    </div>
</ui-prop>

<ui-prop id="status-prop" hidden>
    <ui-label slot="label">Status</ui-label>
    <div slot="content" id="status-text">Not Loaded</div>
</ui-prop>

<ui-section id="config-browser" expand cache-expand="config-loader-browser">
    <div slot="header">Config Browser</div>
    
    <ui-prop id="breadcrumb-prop" hidden>
        <ui-label slot="label">Path</ui-label>
        <div slot="content" id="breadcrumb"></div>
    </ui-prop>
    
    <div id="dropdowns-container"></div>
    <div id="values-container"></div>
    
    <ui-prop style="margin-top: 10px;">
        <ui-button class="green" id="save-config-btn" style="width: 100%;">
            <ui-icon value="save"></ui-icon>
            Save Config
        </ui-button>
    </ui-prop>
</ui-section>
`;

export const $ = {
    configAssetProp: '#config-asset-prop',
    updateAssetProp: '#update-asset-prop',
    clearBtn: '#clear-btn',
    loadBtn: '#load-btn',
    updateBtn: '#update-btn',
    saveConfigBtn: '#save-config-btn',
    statusProp: '#status-prop',
    statusText: '#status-text',
    breadcrumbProp: '#breadcrumb-prop',
    breadcrumb: '#breadcrumb',
    dropdownsContainer: '#dropdowns-container',
    valuesContainer: '#values-container'
};

interface InspectorPanel {
    configData: any;
    editedData: any;
    selectedPath: string[];
    isModified: boolean;
    levelsCache: Record<string, any>;
    dump: any;
}

let _panel: InspectorPanel = null!;

export function ready(this: any) {
    _panel = this as any;
    _panel.configData = null;
    _panel.editedData = null;
    _panel.selectedPath = [];
    _panel.isModified = false;
    _panel.levelsCache = {};

    // Button events
    if ((_panel as any).$.clearBtn) {
        (_panel as any).$.clearBtn.addEventListener('click', onClear);
    }

    if ((_panel as any).$.loadBtn) {
        (_panel as any).$.loadBtn.addEventListener('click', onLoadConfig);
    }

    if ((_panel as any).$.updateBtn) {
        (_panel as any).$.updateBtn.addEventListener('click', onUpdateAndSave);
    }

    if ((_panel as any).$.saveConfigBtn) {
        (_panel as any).$.saveConfigBtn.addEventListener('click', onSaveConfig);
    }
}



export function update(this: any, dump: any) {
    this.dump = dump;

    // Render component properties to ui-prop type="dump" elements
    if (dump && dump.value) {
        // Render configAsset property
        if (this.$.configAssetProp && dump.value.configAsset) {
            this.$.configAssetProp.render(dump.value.configAsset);
        }

        // Render updateConfigAsset property
        if (this.$.updateAssetProp && dump.value.updateConfigAsset) {
            this.$.updateAssetProp.render(dump.value.updateConfigAsset);
        }
    }
}


function onClear() {
    // Clear panel state
    _panel.configData = null;
    _panel.editedData = null;
    _panel.selectedPath = [];
    _panel.isModified = false;
    _panel.levelsCache = {};

    // Clear UI
    (_panel as any).$.dropdownsContainer.innerHTML = '';
    (_panel as any).$.valuesContainer.innerHTML = '';
    (_panel as any).$.breadcrumbProp.hidden = true;
    (_panel as any).$.statusProp.hidden = true;
}

/**
 * Helper: Show error message in status
 */
function showError(message: string) {
    (_panel as any).$.statusProp.hidden = false;
    (_panel as any).$.statusText.textContent = message;
    (_panel as any).$.statusText.style.color = '#F44336';
}

/**
 * Helper: Show success message in status
 */
function showSuccess(message: string) {
    (_panel as any).$.statusProp.hidden = false;
    (_panel as any).$.statusText.textContent = message;
    (_panel as any).$.statusText.style.color = '#4CAF50';
}

/**
 * Helper: Save config data to file
 */
async function saveConfigToFile(assetUUID: string, configData: any): Promise<void> {
    // 1. Query asset info
    const assetInfo: any = await (Editor.Message.request as any)('asset-db', 'query-asset-info', assetUUID);

    if (!assetInfo || !assetInfo.source) {
        throw new Error('Cannot get asset file path');
    }

    let filePath = assetInfo.source;

    // 2. Convert db:// path to absolute path
    if (filePath.startsWith('db:/')) {
        const relativePath = filePath.substring(4).replace(/\//g, path.sep);
        filePath = path.join(Editor.Project.path, relativePath);
    }

    console.log('[Inspector] Saving to file:', filePath);

    // 3. Write file
    const jsonString = JSON.stringify(configData, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf-8');

    console.log('[Inspector] File written successfully');

    // 4. Refresh asset database
    await (Editor.Message.request as any)('asset-db', 'refresh-asset', assetUUID);

    console.log('[Inspector] Asset database refreshed');
}

/**
 * Update & Save: Merge update.json vào game_config.json
 */
async function onUpdateAndSave() {
    console.log('[Inspector] onUpdateAndSave() started');

    try {
        // 1. Validate assets
        const configAssetValue = _panel.dump?.value?.configAsset?.value;
        const updateAssetValue = _panel.dump?.value?.updateConfigAsset?.value;

        if (!configAssetValue) {
            showError('Error: Config Asset required');
            console.error('[Inspector] configAsset is NULL');
            return;
        }

        if (!updateAssetValue) {
            showError('Error: Update Config Asset required');
            console.error('[Inspector] updateConfigAsset is NULL');
            return;
        }

        // 2. Read JSON data
        console.log('[Inspector] Reading config data...');

        // 2a. Get config data (check if .json available, else read file)
        let configData: any;
        if (configAssetValue.json) {
            configData = JSON.parse(JSON.stringify(configAssetValue.json));
            console.log('[Inspector] Using configAsset.json from dump');
        } else {
            // Query asset info and read file
            const assetInfo: any = await (Editor.Message.request as any)('asset-db', 'query-asset-info', configAssetValue.uuid);
            let filePath = assetInfo.source;

            if (filePath.startsWith('db:/')) {
                const relativePath = filePath.substring(4).replace(/\//g, path.sep);
                filePath = path.join(Editor.Project.path, relativePath);
            }

            const jsonContent = fs.readFileSync(filePath, 'utf-8');
            configData = JSON.parse(jsonContent);
            console.log('[Inspector] Read configAsset from file');
        }

        // 2b. Get update data (check if .json available, else read file)
        let updateData: any;
        if (updateAssetValue.json) {
            updateData = updateAssetValue.json;
            console.log('[Inspector] Using updateAsset.json from dump');
        } else {
            // Query asset info and read file
            const assetInfo: any = await (Editor.Message.request as any)('asset-db', 'query-asset-info', updateAssetValue.uuid);
            let filePath = assetInfo.source;

            if (filePath.startsWith('db:/')) {
                const relativePath = filePath.substring(4).replace(/\//g, path.sep);
                filePath = path.join(Editor.Project.path, relativePath);
            }

            const jsonContent = fs.readFileSync(filePath, 'utf-8');
            updateData = JSON.parse(jsonContent);
            console.log('[Inspector] Read updateAsset from file');
        }

        console.log('[Inspector] Config data:', configData);
        console.log('[Inspector] Update data:', updateData);

        // 3. Deep merge
        console.log('[Inspector] Starting deep merge...');
        deepMerge(configData, updateData);
        console.log('[Inspector] Merge completed:', configData);

        // 4. Save to file
        await saveConfigToFile(configAssetValue.uuid, configData);

        // 5. Update panel state
        _panel.configData = configData;
        _panel.editedData = JSON.parse(JSON.stringify(configData));
        _panel.selectedPath = [];
        _panel.isModified = false;

        // 6. Rebuild cache and UI
        buildLevelsCache(_panel.editedData);
        renderLevel1();

        showSuccess('Updated & Saved ✓');
        console.log('[Inspector] onUpdateAndSave() completed');

    } catch (err: any) {
        console.error('[Inspector] Update & Save failed:', err);
        console.error('[Inspector] Error message:', err.message);
        showError('Update & Save Failed ✗');
    }
}


/**
 * Save Config: Save editedData từ Config Browser vào game_config.json
 */
async function onSaveConfig() {
    console.log('[Inspector] onSaveConfig() started');

    try {
        // 1. Validate editedData
        if (!_panel.editedData) {
            showError('Error: No config loaded');
            console.error('[Inspector] editedData is NULL');
            return;
        }

        const configAssetValue = _panel.dump?.value?.configAsset?.value;
        if (!configAssetValue) {
            showError('Error: Config Asset required');
            console.error('[Inspector] configAsset is NULL');
            return;
        }

        console.log('[Inspector] Saving editedData:', _panel.editedData);

        // 2. Save editedData to file
        await saveConfigToFile(configAssetValue.uuid, _panel.editedData);

        // 3. Update panel state
        _panel.configData = JSON.parse(JSON.stringify(_panel.editedData));
        _panel.isModified = false;

        showSuccess('Config Saved ✓');
        console.log('[Inspector] onSaveConfig() completed');

    } catch (err: any) {
        console.error('[Inspector] Save Config failed:', err);
        console.error('[Inspector] Error message:', err.message);
        showError('Save Config Failed ✗');
    }
}


function onLoadConfig() {
    // Kiểm tra xem đã kéo config asset vào chưa (prioritize existing asset)
    const configAssetValue = _panel.dump?.value?.configAsset?.value;
    const updateAssetValue = _panel.dump?.value?.updateConfigAsset?.value;

    // Nếu đã có configAsset hoặc updateAsset (không null), sử dụng luôn
    let assetUUID: string | null = null;
    let configData: any = null;

    if (configAssetValue && configAssetValue.uuid) {
        // Đã kéo configAsset vào → lấy JSON từ asset đó luôn
        assetUUID = configAssetValue.uuid;
        if (configAssetValue.json) {
            configData = configAssetValue.json;
            console.log('[Inspector] Sử dụng configAsset đã kéo vào (không query lại)');
        }
    } else if (updateAssetValue && updateAssetValue.uuid) {
        // Nếu chưa có configAsset nhưng có updateAsset → dùng updateAsset
        assetUUID = updateAssetValue.uuid;
        if (updateAssetValue.json) {
            configData = updateAssetValue.json;
            console.log('[Inspector] Sử dụng updateConfigAsset đã kéo vào (không query lại)');
        }
    }

    // Nếu không có asset nào được kéo vào
    if (!assetUUID) {
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Error: Please drag JSON file to Config Asset';
        (_panel as any).$.statusText.style.color = '#F44336';
        return;
    }

    const compUUID = _panel.dump?.value?.uuid;
    if (!compUUID) {
        console.error('[Inspector] Component UUID not found');
        return;
    }

    // 1. Call component.loadAndApplyConfig()
    (Editor.Message.request as any)('scene', 'execute-component-method', {
        uuid: compUUID,
        name: 'loadAndApplyConfig',
        args: []
    }).then(() => {
        // 2. Nếu đã có configData từ asset (đã kéo vào), skip query và read file
        if (configData) {
            // Build config browser trực tiếp
            _panel.configData = configData;
            _panel.editedData = JSON.parse(JSON.stringify(configData));
            _panel.selectedPath = [];
            _panel.isModified = false;

            buildLevelsCache(_panel.editedData);

            (_panel as any).$.statusProp.hidden = false;
            (_panel as any).$.statusText.textContent = 'Loaded ✓';
            (_panel as any).$.statusText.style.color = '#4CAF50';

            renderLevel1();
            return Promise.resolve(); // Skip .then() chain
        }

        // 3. Nếu chưa có configData, query asset info (fallback logic cũ)
        return (Editor.Message.request as any)('asset-db', 'query-asset-info', assetUUID);
    }).then((assetInfo: any) => {
        // Nếu đã load từ configData, skip bước này
        if (configData) {
            return;
        }

        if (!assetInfo || !assetInfo.source) {
            throw new Error('Asset not found');
        }

        let filePath = assetInfo.source;

        // Convert db:// path
        if (filePath.startsWith('db:/')) {
            const relativePath = filePath.substring(4).replace(/\//g, path.sep);
            filePath = path.join(Editor.Project.path, relativePath);
        }

        // Read JSON file
        const jsonContent = fs.readFileSync(filePath, 'utf-8');
        configData = JSON.parse(jsonContent);

        // Build config browser
        _panel.configData = configData;
        _panel.editedData = JSON.parse(JSON.stringify(configData));
        _panel.selectedPath = [];
        _panel.isModified = false;

        buildLevelsCache(_panel.editedData);

        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Loaded ✓';
        (_panel as any).$.statusText.style.color = '#4CAF50';

        renderLevel1();

    }).catch((err: any) => {
        console.error('[Inspector] Load error:', err);
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Load Failed ✗';
        (_panel as any).$.statusText.style.color = '#F44336';
    });
}




/**
 * Deep merge source vào target
 */
function deepMerge(target: any, source: any): void {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // Nếu là object và chưa tồn tại trong target → tạo mới
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                // Đệ quy merge vào object con
                deepMerge(target[key], source[key]);
            } else {
                // Primitive value hoặc array → ghi đè trực tiếp
                target[key] = source[key];
            }
        }
    }
}

function buildLevelsCache(data: any, pathPrefix: string[] = []) {
    const pathKey = pathPrefix.join('.');

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const keys = Object.keys(data);

        _panel.levelsCache[pathKey] = {
            options: keys,
            path: pathPrefix,
            data: data
        };

        keys.forEach(key => {
            const newPath = [...pathPrefix, key];
            buildLevelsCache(data[key], newPath);
        });
    }
}

function renderLevel1() {
    const cacheEntry = _panel.levelsCache[''];
    if (cacheEntry) {
        renderDropdown(0, cacheEntry.options);
        (_panel as any).$.breadcrumbProp.hidden = true;
    }
}

function renderDropdown(level: number, options: string[]) {
    while ((_panel as any).$.dropdownsContainer.children.length > level) {
        (_panel as any).$.dropdownsContainer.lastChild.remove();
    }

    (_panel as any).$.valuesContainer.innerHTML = '';

    const prop = document.createElement('ui-prop');
    const label = document.createElement('ui-label');
    label.slot = 'label';
    label.textContent = `Level ${level + 1}`;

    const select = document.createElement('ui-select');
    select.slot = 'content';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select --';
    select.appendChild(placeholder);

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });

    select.addEventListener('change', (e: any) => {
        const selectedKey = e.target.value;
        if (selectedKey) {
            onSelectField(level, selectedKey);
        }
    });

    prop.appendChild(label);
    prop.appendChild(select);
    (_panel as any).$.dropdownsContainer.appendChild(prop);
}

function onSelectField(level: number, key: string) {
    _panel.selectedPath = _panel.selectedPath.slice(0, level);
    _panel.selectedPath.push(key);

    updateBreadcrumb();

    while ((_panel as any).$.dropdownsContainer.children.length > level + 1) {
        (_panel as any).$.dropdownsContainer.lastChild.remove();
    }
    (_panel as any).$.valuesContainer.innerHTML = '';

    const pathKey = _panel.selectedPath.join('.');
    const cacheEntry = _panel.levelsCache[pathKey];

    if (cacheEntry && cacheEntry.options) {
        const hasOnlyPrimitives = cacheEntry.options.every((k: string) => {
            const val = cacheEntry.data[k];
            const valType = typeof val;
            return valType === 'number' || valType === 'string' || valType === 'boolean' || val === null;
        });

        renderDropdown(level + 1, cacheEntry.options);

        if (hasOnlyPrimitives) {
            renderValues(cacheEntry.data);
        }
    } else {
        let current = _panel.editedData;
        for (const k of _panel.selectedPath) {
            current = current[k];
        }
        renderValues({ [key]: current });
    }
}

function updateBreadcrumb() {
    if (_panel.selectedPath.length > 0) {
        (_panel as any).$.breadcrumbProp.hidden = false;
        (_panel as any).$.breadcrumb.textContent = _panel.selectedPath.join(' / ');
    } else {
        (_panel as any).$.breadcrumbProp.hidden = true;
    }
}

function renderValues(obj: any) {
    (_panel as any).$.valuesContainer.innerHTML = '';

    Object.keys(obj).forEach(key => {
        const value = obj[key];
        const prop = document.createElement('ui-prop');

        const label = document.createElement('ui-label');
        label.slot = 'label';
        label.textContent = key;

        let input: any;
        if (typeof value === 'number') {
            input = document.createElement('ui-num-input');
            input.value = value;
            // Editable - track changes
            input.addEventListener('change', (e: any) => {
                onValueChange(key, parseFloat(e.target.value));
            });
        } else if (typeof value === 'boolean') {
            input = document.createElement('ui-checkbox');
            input.checked = value;
            // Editable - track changes
            input.addEventListener('change', (e: any) => {
                onValueChange(key, e.target.checked);
            });
        } else {
            input = document.createElement('ui-input');
            input.value = value !== null ? String(value) : '';
            // Editable - track changes
            input.addEventListener('change', (e: any) => {
                onValueChange(key, e.target.value);
            });
        }

        input.slot = 'content';

        prop.appendChild(label);
        prop.appendChild(input);
        (_panel as any).$.valuesContainer.appendChild(prop);
    });
}

/**
 * Handle value change - update editedData ở deep nested path
 */
function onValueChange(key: string, newValue: any) {
    // Navigate to current path trong editedData
    let current = _panel.editedData;
    for (const pathKey of _panel.selectedPath) {
        current = current[pathKey];
    }

    // Update value
    current[key] = newValue;
    _panel.isModified = true;
}
