'use strict';

// Removed invalid import. relying on global types or 'any' for simplicity in this script context.
// import { IPanelThis } from "@cocos/creator-types/editor"; 

// Declare require to fix TS error since @types/node might not be included in tsconfig types list
declare const require: any;

const path = require('path');
const fs = require('fs');

type Selector<$> = { $: Record<keyof $, any | null> }

export const template = `
<ui-prop>
    <ui-label slot="label">Config Asset</ui-label>
    <ui-asset slot="content" id="config-asset" droppable="cc.JsonAsset"></ui-asset>
</ui-prop>

<ui-prop>
    <ui-label slot="label">Update Config Asset</ui-label>
    <ui-asset slot="content" id="update-asset" droppable="cc.JsonAsset"></ui-asset>
</ui-prop>

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
</ui-section>
`;

export const $ = {
    asset: '#config-asset',
    updateAsset: '#update-asset',
    clearBtn: '#clear-btn',
    loadBtn: '#load-btn',
    updateBtn: '#update-btn',
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
        (_panel as any).$.updateBtn.addEventListener('click', onUpdateConfig);
    }
}

export function update(this: any, dump: any) {
    this.dump = dump;
}

function onClear() {
    console.log('[Inspector] Clear button clicked');

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

    console.log('[Inspector] ✓ Cleared all state');
}

function onLoadConfig() {
    console.log('[Inspector] ========== LOAD CONFIG START ==========');

    // Đọc UUID trực tiếp từ ui-asset
    const assetUUID = (_panel as any).$.asset.value;
    console.log('[Inspector] Config asset UUID from ui-asset.value:', assetUUID);

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
        console.log('[Inspector] ✓ Component loadAndApplyConfig() called');

        // 2. Query asset info
        return (Editor.Message.request as any)('asset-db', 'query-asset-info', assetUUID);
    }).then((assetInfo: any) => {
        if (!assetInfo || !assetInfo.source) {
            throw new Error('Asset not found');
        }

        let filePath = assetInfo.source;
        console.log('[Inspector] Asset source path:', filePath);

        // Convert db:// path
        if (filePath.startsWith('db:/')) {
            const relativePath = filePath.substring(4).replace(/\//g, path.sep);
            filePath = path.join(Editor.Project.path, relativePath);
        }

        // 3. Read JSON file
        const jsonContent = fs.readFileSync(filePath, 'utf-8');
        const configData = JSON.parse(jsonContent);

        // 4. Build config browser
        _panel.configData = configData;
        _panel.editedData = JSON.parse(JSON.stringify(configData));
        _panel.selectedPath = [];
        _panel.isModified = false;

        buildLevelsCache(_panel.editedData);

        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Loaded ✓';
        (_panel as any).$.statusText.style.color = '#4CAF50';

        renderLevel1();

        console.log('[Inspector] ========== LOAD CONFIG COMPLETE ==========');

    }).catch((err: any) => {
        console.error('[Inspector] Load error:', err);
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Load Failed ✗';
        (_panel as any).$.statusText.style.color = '#F44336';
    });
}

async function onUpdateConfig() {
    console.log('[Inspector] ========== UPDATE & SAVE START ==========');

    // Đọc UUID từ ui-asset
    const configAssetUUID = (_panel as any).$.asset.value;
    const updateAssetUUID = (_panel as any).$.updateAsset.value;

    console.log('[Inspector] Config asset UUID:', configAssetUUID);
    console.log('[Inspector] Update asset UUID:', updateAssetUUID);

    if (!configAssetUUID) {
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Error: Config Asset required';
        (_panel as any).$.statusText.style.color = '#F44336';
        return;
    }

    if (!updateAssetUUID) {
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Error: Update Config Asset required';
        (_panel as any).$.statusText.style.color = '#F44336';
        return;
    }

    try {
        // 1. Get file paths
        const configAssetInfo: any = await (Editor.Message.request as any)('asset-db', 'query-asset-info', configAssetUUID);
        const updateAssetInfo: any = await (Editor.Message.request as any)('asset-db', 'query-asset-info', updateAssetUUID);

        let configFilePath = configAssetInfo.source;
        let updateFilePath = updateAssetInfo.source;

        // Convert db:// paths
        if (configFilePath.startsWith('db:/')) {
            const relativePath = configFilePath.substring(4).replace(/\//g, path.sep);
            configFilePath = path.join(Editor.Project.path, relativePath);
        }
        if (updateFilePath.startsWith('db:/')) {
            const relativePath = updateFilePath.substring(4).replace(/\//g, path.sep);
            updateFilePath = path.join(Editor.Project.path, relativePath);
        }

        console.log('[Inspector] Config file path:', configFilePath);
        console.log('[Inspector] Update file path:', updateFilePath);

        // 2. Read both JSON files
        const configData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        const updateData = JSON.parse(fs.readFileSync(updateFilePath, 'utf-8'));

        console.log('[Inspector] === BEFORE MERGE ===');
        console.log('[Inspector] Config:', JSON.stringify(configData, null, 2));
        console.log('[Inspector] Update:', JSON.stringify(updateData, null, 2));

        // 3. Deep merge
        deepMerge(configData, updateData);

        console.log('[Inspector] === AFTER MERGE ===');
        console.log('[Inspector] Merged config:', JSON.stringify(configData, null, 2));

        // 4. Save to file
        const jsonString = JSON.stringify(configData, null, 4);
        fs.writeFileSync(configFilePath, jsonString, 'utf-8');

        console.log('[Inspector] ✓✓✓ SAVED to file:', configFilePath);

        // 5. Refresh asset database
        await (Editor.Message.request as any)('asset-db', 'refresh-asset', configAssetUUID);

        // 6. Update UI
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Updated & Saved ✓';
        (_panel as any).$.statusText.style.color = '#FF9800';

        // 7. Reload config to show changes
        setTimeout(() => {
            onLoadConfig();
        }, 500);

        console.log('[Inspector] ========== UPDATE & SAVE COMPLETE ==========');

    } catch (err: any) {
        console.error('[Inspector] Update failed:', err);
        (_panel as any).$.statusProp.hidden = false;
        (_panel as any).$.statusText.textContent = 'Update Failed ✗';
        (_panel as any).$.statusText.style.color = '#F44336';
    }
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
            input.setAttribute('readonly', 'true'); // Read-only vì chỉ xem
        } else if (typeof value === 'boolean') {
            input = document.createElement('ui-checkbox');
            input.checked = value;
            input.setAttribute('disabled', 'true'); // Disabled vì chỉ xem
        } else {
            input = document.createElement('ui-input');
            input.value = value !== null ? String(value) : '';
            input.setAttribute('readonly', 'true'); // Read-only
        }

        input.slot = 'content';

        prop.appendChild(label);
        prop.appendChild(input);
        (_panel as any).$.valuesContainer.appendChild(prop);
    });
}
