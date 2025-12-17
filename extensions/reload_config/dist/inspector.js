'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ = exports.template = void 0;
exports.ready = ready;
exports.update = update;
const path = require('path');
const fs = require('fs');
exports.template = `
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
exports.$ = {
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
let _panel = null;
function ready() {
    _panel = this;
    _panel.configData = null;
    _panel.editedData = null;
    _panel.selectedPath = [];
    _panel.isModified = false;
    _panel.levelsCache = {};
    // Button events
    if (_panel.$.clearBtn) {
        _panel.$.clearBtn.addEventListener('click', onClear);
    }
    if (_panel.$.loadBtn) {
        _panel.$.loadBtn.addEventListener('click', onLoadConfig);
    }
    if (_panel.$.updateBtn) {
        _panel.$.updateBtn.addEventListener('click', onUpdateAndSave);
    }
    if (_panel.$.saveConfigBtn) {
        _panel.$.saveConfigBtn.addEventListener('click', onSaveConfig);
    }
}
function update(dump) {
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
    _panel.$.dropdownsContainer.innerHTML = '';
    _panel.$.valuesContainer.innerHTML = '';
    _panel.$.breadcrumbProp.hidden = true;
    _panel.$.statusProp.hidden = true;
}
/**
 * Helper: Show error message in status
 */
function showError(message) {
    _panel.$.statusProp.hidden = false;
    _panel.$.statusText.textContent = message;
    _panel.$.statusText.style.color = '#F44336';
}
/**
 * Helper: Show success message in status
 */
function showSuccess(message) {
    _panel.$.statusProp.hidden = false;
    _panel.$.statusText.textContent = message;
    _panel.$.statusText.style.color = '#4CAF50';
}
/**
 * Helper: Save config data to file
 */
async function saveConfigToFile(assetUUID, configData) {
    // 1. Query asset info
    const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', assetUUID);
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
    await Editor.Message.request('asset-db', 'refresh-asset', assetUUID);
    console.log('[Inspector] Asset database refreshed');
}
/**
 * Update & Save: Merge update.json vào game_config.json
 */
async function onUpdateAndSave() {
    var _a, _b, _c, _d, _e, _f;
    console.log('[Inspector] onUpdateAndSave() started');
    try {
        // 1. Validate assets
        const configAssetValue = (_c = (_b = (_a = _panel.dump) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.configAsset) === null || _c === void 0 ? void 0 : _c.value;
        const updateAssetValue = (_f = (_e = (_d = _panel.dump) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.updateConfigAsset) === null || _f === void 0 ? void 0 : _f.value;
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
        let configData;
        if (configAssetValue.json) {
            configData = JSON.parse(JSON.stringify(configAssetValue.json));
            console.log('[Inspector] Using configAsset.json from dump');
        }
        else {
            // Query asset info and read file
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', configAssetValue.uuid);
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
        let updateData;
        if (updateAssetValue.json) {
            updateData = updateAssetValue.json;
            console.log('[Inspector] Using updateAsset.json from dump');
        }
        else {
            // Query asset info and read file
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', updateAssetValue.uuid);
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
    }
    catch (err) {
        console.error('[Inspector] Update & Save failed:', err);
        console.error('[Inspector] Error message:', err.message);
        showError('Update & Save Failed ✗');
    }
}
/**
 * Save Config: Save editedData từ Config Browser vào game_config.json
 */
async function onSaveConfig() {
    var _a, _b, _c;
    console.log('[Inspector] onSaveConfig() started');
    try {
        // 1. Validate editedData
        if (!_panel.editedData) {
            showError('Error: No config loaded');
            console.error('[Inspector] editedData is NULL');
            return;
        }
        const configAssetValue = (_c = (_b = (_a = _panel.dump) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.configAsset) === null || _c === void 0 ? void 0 : _c.value;
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
    }
    catch (err) {
        console.error('[Inspector] Save Config failed:', err);
        console.error('[Inspector] Error message:', err.message);
        showError('Save Config Failed ✗');
    }
}
function onLoadConfig() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Kiểm tra xem đã kéo config asset vào chưa (prioritize existing asset)
    const configAssetValue = (_c = (_b = (_a = _panel.dump) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.configAsset) === null || _c === void 0 ? void 0 : _c.value;
    const updateAssetValue = (_f = (_e = (_d = _panel.dump) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.updateConfigAsset) === null || _f === void 0 ? void 0 : _f.value;
    // Nếu đã có configAsset hoặc updateAsset (không null), sử dụng luôn
    let assetUUID = null;
    let configData = null;
    if (configAssetValue && configAssetValue.uuid) {
        // Đã kéo configAsset vào → lấy JSON từ asset đó luôn
        assetUUID = configAssetValue.uuid;
        if (configAssetValue.json) {
            configData = configAssetValue.json;
            console.log('[Inspector] Sử dụng configAsset đã kéo vào (không query lại)');
        }
    }
    else if (updateAssetValue && updateAssetValue.uuid) {
        // Nếu chưa có configAsset nhưng có updateAsset → dùng updateAsset
        assetUUID = updateAssetValue.uuid;
        if (updateAssetValue.json) {
            configData = updateAssetValue.json;
            console.log('[Inspector] Sử dụng updateConfigAsset đã kéo vào (không query lại)');
        }
    }
    // Nếu không có asset nào được kéo vào
    if (!assetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Please drag JSON file to Config Asset';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }
    const compUUID = (_h = (_g = _panel.dump) === null || _g === void 0 ? void 0 : _g.value) === null || _h === void 0 ? void 0 : _h.uuid;
    if (!compUUID) {
        console.error('[Inspector] Component UUID not found');
        return;
    }
    // 1. Call component.loadAndApplyConfig()
    Editor.Message.request('scene', 'execute-component-method', {
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
            _panel.$.statusProp.hidden = false;
            _panel.$.statusText.textContent = 'Loaded ✓';
            _panel.$.statusText.style.color = '#4CAF50';
            renderLevel1();
            return Promise.resolve(); // Skip .then() chain
        }
        // 3. Nếu chưa có configData, query asset info (fallback logic cũ)
        return Editor.Message.request('asset-db', 'query-asset-info', assetUUID);
    }).then((assetInfo) => {
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
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Loaded ✓';
        _panel.$.statusText.style.color = '#4CAF50';
        renderLevel1();
    }).catch((err) => {
        console.error('[Inspector] Load error:', err);
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Load Failed ✗';
        _panel.$.statusText.style.color = '#F44336';
    });
}
/**
 * Deep merge source vào target
 */
function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // Nếu là object và chưa tồn tại trong target → tạo mới
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                // Đệ quy merge vào object con
                deepMerge(target[key], source[key]);
            }
            else {
                // Primitive value hoặc array → ghi đè trực tiếp
                target[key] = source[key];
            }
        }
    }
}
function buildLevelsCache(data, pathPrefix = []) {
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
        _panel.$.breadcrumbProp.hidden = true;
    }
}
function renderDropdown(level, options) {
    while (_panel.$.dropdownsContainer.children.length > level) {
        _panel.$.dropdownsContainer.lastChild.remove();
    }
    _panel.$.valuesContainer.innerHTML = '';
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
    select.addEventListener('change', (e) => {
        const selectedKey = e.target.value;
        if (selectedKey) {
            onSelectField(level, selectedKey);
        }
    });
    prop.appendChild(label);
    prop.appendChild(select);
    _panel.$.dropdownsContainer.appendChild(prop);
}
function onSelectField(level, key) {
    _panel.selectedPath = _panel.selectedPath.slice(0, level);
    _panel.selectedPath.push(key);
    updateBreadcrumb();
    while (_panel.$.dropdownsContainer.children.length > level + 1) {
        _panel.$.dropdownsContainer.lastChild.remove();
    }
    _panel.$.valuesContainer.innerHTML = '';
    const pathKey = _panel.selectedPath.join('.');
    const cacheEntry = _panel.levelsCache[pathKey];
    if (cacheEntry && cacheEntry.options) {
        const hasOnlyPrimitives = cacheEntry.options.every((k) => {
            const val = cacheEntry.data[k];
            const valType = typeof val;
            return valType === 'number' || valType === 'string' || valType === 'boolean' || val === null;
        });
        renderDropdown(level + 1, cacheEntry.options);
        if (hasOnlyPrimitives) {
            renderValues(cacheEntry.data);
        }
    }
    else {
        let current = _panel.editedData;
        for (const k of _panel.selectedPath) {
            current = current[k];
        }
        renderValues({ [key]: current });
    }
}
function updateBreadcrumb() {
    if (_panel.selectedPath.length > 0) {
        _panel.$.breadcrumbProp.hidden = false;
        _panel.$.breadcrumb.textContent = _panel.selectedPath.join(' / ');
    }
    else {
        _panel.$.breadcrumbProp.hidden = true;
    }
}
function renderValues(obj) {
    _panel.$.valuesContainer.innerHTML = '';
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        const prop = document.createElement('ui-prop');
        const label = document.createElement('ui-label');
        label.slot = 'label';
        label.textContent = key;
        let input;
        if (typeof value === 'number') {
            input = document.createElement('ui-num-input');
            input.value = value;
            // Editable - track changes
            input.addEventListener('change', (e) => {
                onValueChange(key, parseFloat(e.target.value));
            });
        }
        else if (typeof value === 'boolean') {
            input = document.createElement('ui-checkbox');
            input.checked = value;
            // Editable - track changes
            input.addEventListener('change', (e) => {
                onValueChange(key, e.target.checked);
            });
        }
        else {
            input = document.createElement('ui-input');
            input.value = value !== null ? String(value) : '';
            // Editable - track changes
            input.addEventListener('change', (e) => {
                onValueChange(key, e.target.value);
            });
        }
        input.slot = 'content';
        prop.appendChild(label);
        prop.appendChild(input);
        _panel.$.valuesContainer.appendChild(prop);
    });
}
/**
 * Handle value change - update editedData ở deep nested path
 */
function onValueChange(key, newValue) {
    // Navigate to current path trong editedData
    let current = _panel.editedData;
    for (const pathKey of _panel.selectedPath) {
        current = current[pathKey];
    }
    // Update value
    current[key] = newValue;
    _panel.isModified = true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL2luc3BlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7OztBQTJGYixzQkF3QkM7QUFJRCx3QkFlQztBQTdIRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBSVosUUFBQSxRQUFRLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FpRHZCLENBQUM7QUFFVyxRQUFBLENBQUMsR0FBRztJQUNiLGVBQWUsRUFBRSxvQkFBb0I7SUFDckMsZUFBZSxFQUFFLG9CQUFvQjtJQUNyQyxRQUFRLEVBQUUsWUFBWTtJQUN0QixPQUFPLEVBQUUsV0FBVztJQUNwQixTQUFTLEVBQUUsYUFBYTtJQUN4QixhQUFhLEVBQUUsa0JBQWtCO0lBQ2pDLFVBQVUsRUFBRSxjQUFjO0lBQzFCLFVBQVUsRUFBRSxjQUFjO0lBQzFCLGNBQWMsRUFBRSxrQkFBa0I7SUFDbEMsVUFBVSxFQUFFLGFBQWE7SUFDekIsa0JBQWtCLEVBQUUsc0JBQXNCO0lBQzFDLGVBQWUsRUFBRSxtQkFBbUI7Q0FDdkMsQ0FBQztBQVdGLElBQUksTUFBTSxHQUFtQixJQUFLLENBQUM7QUFFbkMsU0FBZ0IsS0FBSztJQUNqQixNQUFNLEdBQUcsSUFBVyxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBQzFCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBRXhCLGdCQUFnQjtJQUNoQixJQUFLLE1B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O0lBQzdDLDRDQUE0QztJQUM1QyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ2hDLEtBQUssTUFBTSxPQUFPLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3hDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELGVBQWU7SUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3hCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG4vLyBSZW1vdmVkIGludmFsaWQgaW1wb3J0LiByZWx5aW5nIG9uIGdsb2JhbCB0eXBlcyBvciAnYW55JyBmb3Igc2ltcGxpY2l0eSBpbiB0aGlzIHNjcmlwdCBjb250ZXh0LlxyXG4vLyBpbXBvcnQgeyBJUGFuZWxUaGlzIH0gZnJvbSBcIkBjb2Nvcy9jcmVhdG9yLXR5cGVzL2VkaXRvclwiOyBcclxuXHJcbi8vIERlY2xhcmUgcmVxdWlyZSB0byBmaXggVFMgZXJyb3Igc2luY2UgQHR5cGVzL25vZGUgbWlnaHQgbm90IGJlIGluY2x1ZGVkIGluIHRzY29uZmlnIHR5cGVzIGxpc3RcclxuZGVjbGFyZSBjb25zdCByZXF1aXJlOiBhbnk7XHJcbmRlY2xhcmUgY29uc3QgRWRpdG9yOiBhbnk7XHJcblxyXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcblxyXG50eXBlIFNlbGVjdG9yPCQ+ID0geyAkOiBSZWNvcmQ8a2V5b2YgJCwgYW55IHwgbnVsbD4gfVxyXG5cclxuZXhwb3J0IGNvbnN0IHRlbXBsYXRlID0gYFxyXG48dWktcHJvcCB0eXBlPVwiZHVtcFwiIGlkPVwiY29uZmlnLWFzc2V0LXByb3BcIj48L3VpLXByb3A+XHJcbjx1aS1wcm9wIHR5cGU9XCJkdW1wXCIgaWQ9XCJ1cGRhdGUtYXNzZXQtcHJvcFwiPjwvdWktcHJvcD5cclxuXHJcbjx1aS1wcm9wPlxyXG4gICAgPHVpLWxhYmVsIHNsb3Q9XCJsYWJlbFwiPkFjdGlvbnM8L3VpLWxhYmVsPlxyXG4gICAgPGRpdiBzbG90PVwiY29udGVudFwiIHN0eWxlPVwiZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsgZ2FwOiA1cHg7XCI+XHJcbiAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGdhcDogNXB4O1wiPlxyXG4gICAgICAgICAgICA8dWktYnV0dG9uIGlkPVwiY2xlYXItYnRuXCI+XHJcbiAgICAgICAgICAgICAgICA8dWktaWNvbiB2YWx1ZT1cInRyYXNoXCI+PC91aS1pY29uPlxyXG4gICAgICAgICAgICAgICAgQ2xlYXJcclxuICAgICAgICAgICAgPC91aS1idXR0b24+XHJcbiAgICAgICAgICAgIDx1aS1idXR0b24gY2xhc3M9XCJibHVlXCIgaWQ9XCJsb2FkLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgPHVpLWljb24gdmFsdWU9XCJkb3dubG9hZFwiPjwvdWktaWNvbj5cclxuICAgICAgICAgICAgICAgIExvYWRcclxuICAgICAgICAgICAgPC91aS1idXR0b24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGdhcDogNXB4O1wiPlxyXG4gICAgICAgICAgICA8dWktYnV0dG9uIGNsYXNzPVwib3JhbmdlXCIgaWQ9XCJ1cGRhdGUtYnRuXCIgc3R5bGU9XCJmbGV4OiAxO1wiPlxyXG4gICAgICAgICAgICAgICAgPHVpLWljb24gdmFsdWU9XCJyZWZyZXNoXCI+PC91aS1pY29uPlxyXG4gICAgICAgICAgICAgICAgVXBkYXRlICYgU2F2ZVxyXG4gICAgICAgICAgICA8L3VpLWJ1dHRvbj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG48L3VpLXByb3A+XHJcblxyXG48dWktcHJvcCBpZD1cInN0YXR1cy1wcm9wXCIgaGlkZGVuPlxyXG4gICAgPHVpLWxhYmVsIHNsb3Q9XCJsYWJlbFwiPlN0YXR1czwvdWktbGFiZWw+XHJcbiAgICA8ZGl2IHNsb3Q9XCJjb250ZW50XCIgaWQ9XCJzdGF0dXMtdGV4dFwiPk5vdCBMb2FkZWQ8L2Rpdj5cclxuPC91aS1wcm9wPlxyXG5cclxuPHVpLXNlY3Rpb24gaWQ9XCJjb25maWctYnJvd3NlclwiIGV4cGFuZCBjYWNoZS1leHBhbmQ9XCJjb25maWctbG9hZGVyLWJyb3dzZXJcIj5cclxuICAgIDxkaXYgc2xvdD1cImhlYWRlclwiPkNvbmZpZyBCcm93c2VyPC9kaXY+XHJcbiAgICBcclxuICAgIDx1aS1wcm9wIGlkPVwiYnJlYWRjcnVtYi1wcm9wXCIgaGlkZGVuPlxyXG4gICAgICAgIDx1aS1sYWJlbCBzbG90PVwibGFiZWxcIj5QYXRoPC91aS1sYWJlbD5cclxuICAgICAgICA8ZGl2IHNsb3Q9XCJjb250ZW50XCIgaWQ9XCJicmVhZGNydW1iXCI+PC9kaXY+XHJcbiAgICA8L3VpLXByb3A+XHJcbiAgICBcclxuICAgIDxkaXYgaWQ9XCJkcm9wZG93bnMtY29udGFpbmVyXCI+PC9kaXY+XHJcbiAgICA8ZGl2IGlkPVwidmFsdWVzLWNvbnRhaW5lclwiPjwvZGl2PlxyXG4gICAgXHJcbiAgICA8dWktcHJvcCBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+XHJcbiAgICAgICAgPHVpLWJ1dHRvbiBjbGFzcz1cImdyZWVuXCIgaWQ9XCJzYXZlLWNvbmZpZy1idG5cIiBzdHlsZT1cIndpZHRoOiAxMDAlO1wiPlxyXG4gICAgICAgICAgICA8dWktaWNvbiB2YWx1ZT1cInNhdmVcIj48L3VpLWljb24+XHJcbiAgICAgICAgICAgIFNhdmUgQ29uZmlnXHJcbiAgICAgICAgPC91aS1idXR0b24+XHJcbiAgICA8L3VpLXByb3A+XHJcbjwvdWktc2VjdGlvbj5cclxuYDtcclxuXHJcbmV4cG9ydCBjb25zdCAkID0ge1xyXG4gICAgY29uZmlnQXNzZXRQcm9wOiAnI2NvbmZpZy1hc3NldC1wcm9wJyxcclxuICAgIHVwZGF0ZUFzc2V0UHJvcDogJyN1cGRhdGUtYXNzZXQtcHJvcCcsXHJcbiAgICBjbGVhckJ0bjogJyNjbGVhci1idG4nLFxyXG4gICAgbG9hZEJ0bjogJyNsb2FkLWJ0bicsXHJcbiAgICB1cGRhdGVCdG46ICcjdXBkYXRlLWJ0bicsXHJcbiAgICBzYXZlQ29uZmlnQnRuOiAnI3NhdmUtY29uZmlnLWJ0bicsXHJcbiAgICBzdGF0dXNQcm9wOiAnI3N0YXR1cy1wcm9wJyxcclxuICAgIHN0YXR1c1RleHQ6ICcjc3RhdHVzLXRleHQnLFxyXG4gICAgYnJlYWRjcnVtYlByb3A6ICcjYnJlYWRjcnVtYi1wcm9wJyxcclxuICAgIGJyZWFkY3J1bWI6ICcjYnJlYWRjcnVtYicsXHJcbiAgICBkcm9wZG93bnNDb250YWluZXI6ICcjZHJvcGRvd25zLWNvbnRhaW5lcicsXHJcbiAgICB2YWx1ZXNDb250YWluZXI6ICcjdmFsdWVzLWNvbnRhaW5lcidcclxufTtcclxuXHJcbmludGVyZmFjZSBJbnNwZWN0b3JQYW5lbCB7XHJcbiAgICBjb25maWdEYXRhOiBhbnk7XHJcbiAgICBlZGl0ZWREYXRhOiBhbnk7XHJcbiAgICBzZWxlY3RlZFBhdGg6IHN0cmluZ1tdO1xyXG4gICAgaXNNb2RpZmllZDogYm9vbGVhbjtcclxuICAgIGxldmVsc0NhY2hlOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgZHVtcDogYW55O1xyXG59XHJcblxyXG5sZXQgX3BhbmVsOiBJbnNwZWN0b3JQYW5lbCA9IG51bGwhO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWR5KHRoaXM6IGFueSkge1xyXG4gICAgX3BhbmVsID0gdGhpcyBhcyBhbnk7XHJcbiAgICBfcGFuZWwuY29uZmlnRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgX3BhbmVsLmxldmVsc0NhY2hlID0ge307XHJcblxyXG4gICAgLy8gQnV0dG9uIGV2ZW50c1xyXG4gICAgaWYgKChfcGFuZWwgYXMgYW55KS4kLmNsZWFyQnRuKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuY2xlYXJCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvbkNsZWFyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoKF9wYW5lbCBhcyBhbnkpLiQubG9hZEJ0bikge1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmxvYWRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvbkxvYWRDb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICgoX3BhbmVsIGFzIGFueSkuJC51cGRhdGVCdG4pIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC51cGRhdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvblVwZGF0ZUFuZFNhdmUpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICgoX3BhbmVsIGFzIGFueSkuJC5zYXZlQ29uZmlnQnRuKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc2F2ZUNvbmZpZ0J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG9uU2F2ZUNvbmZpZyk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZSh0aGlzOiBhbnksIGR1bXA6IGFueSkge1xyXG4gICAgdGhpcy5kdW1wID0gZHVtcDtcclxuXHJcbiAgICAvLyBSZW5kZXIgY29tcG9uZW50IHByb3BlcnRpZXMgdG8gdWktcHJvcCB0eXBlPVwiZHVtcFwiIGVsZW1lbnRzXHJcbiAgICBpZiAoZHVtcCAmJiBkdW1wLnZhbHVlKSB7XHJcbiAgICAgICAgLy8gUmVuZGVyIGNvbmZpZ0Fzc2V0IHByb3BlcnR5XHJcbiAgICAgICAgaWYgKHRoaXMuJC5jb25maWdBc3NldFByb3AgJiYgZHVtcC52YWx1ZS5jb25maWdBc3NldCkge1xyXG4gICAgICAgICAgICB0aGlzLiQuY29uZmlnQXNzZXRQcm9wLnJlbmRlcihkdW1wLnZhbHVlLmNvbmZpZ0Fzc2V0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbmRlciB1cGRhdGVDb25maWdBc3NldCBwcm9wZXJ0eVxyXG4gICAgICAgIGlmICh0aGlzLiQudXBkYXRlQXNzZXRQcm9wICYmIGR1bXAudmFsdWUudXBkYXRlQ29uZmlnQXNzZXQpIHtcclxuICAgICAgICAgICAgdGhpcy4kLnVwZGF0ZUFzc2V0UHJvcC5yZW5kZXIoZHVtcC52YWx1ZS51cGRhdGVDb25maWdBc3NldCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gb25DbGVhcigpIHtcclxuICAgIC8vIENsZWFyIHBhbmVsIHN0YXRlXHJcbiAgICBfcGFuZWwuY29uZmlnRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgX3BhbmVsLmxldmVsc0NhY2hlID0ge307XHJcblxyXG4gICAgLy8gQ2xlYXIgVUlcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLmRyb3Bkb3duc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnZhbHVlc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLmJyZWFkY3J1bWJQcm9wLmhpZGRlbiA9IHRydWU7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXI6IFNob3cgZXJyb3IgbWVzc2FnZSBpbiBzdGF0dXNcclxuICovXHJcbmZ1bmN0aW9uIHNob3dFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1Byb3AuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gbWVzc2FnZTtcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnI0Y0NDMzNic7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXI6IFNob3cgc3VjY2VzcyBtZXNzYWdlIGluIHN0YXR1c1xyXG4gKi9cclxuZnVuY3Rpb24gc2hvd1N1Y2Nlc3MobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9IG1lc3NhZ2U7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnN0eWxlLmNvbG9yID0gJyM0Q0FGNTAnO1xyXG59XHJcblxyXG4vKipcclxuICogSGVscGVyOiBTYXZlIGNvbmZpZyBkYXRhIHRvIGZpbGVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHNhdmVDb25maWdUb0ZpbGUoYXNzZXRVVUlEOiBzdHJpbmcsIGNvbmZpZ0RhdGE6IGFueSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gMS4gUXVlcnkgYXNzZXQgaW5mb1xyXG4gICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXNzZXRVVUlEKTtcclxuXHJcbiAgICBpZiAoIWFzc2V0SW5mbyB8fCAhYXNzZXRJbmZvLnNvdXJjZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGdldCBhc3NldCBmaWxlIHBhdGgnKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgZmlsZVBhdGggPSBhc3NldEluZm8uc291cmNlO1xyXG5cclxuICAgIC8vIDIuIENvbnZlcnQgZGI6Ly8gcGF0aCB0byBhYnNvbHV0ZSBwYXRoXHJcbiAgICBpZiAoZmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6LycpKSB7XHJcbiAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gZmlsZVBhdGguc3Vic3RyaW5nKDQpLnJlcGxhY2UoL1xcLy9nLCBwYXRoLnNlcCk7XHJcbiAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgcmVsYXRpdmVQYXRoKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gU2F2aW5nIHRvIGZpbGU6JywgZmlsZVBhdGgpO1xyXG5cclxuICAgIC8vIDMuIFdyaXRlIGZpbGVcclxuICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShjb25maWdEYXRhLCBudWxsLCA0KTtcclxuICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGpzb25TdHJpbmcsICd1dGYtOCcpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdbSW5zcGVjdG9yXSBGaWxlIHdyaXR0ZW4gc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgLy8gNC4gUmVmcmVzaCBhc3NldCBkYXRhYmFzZVxyXG4gICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGFzc2V0VVVJRCk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIEFzc2V0IGRhdGFiYXNlIHJlZnJlc2hlZCcpO1xyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlICYgU2F2ZTogTWVyZ2UgdXBkYXRlLmpzb24gdsOgbyBnYW1lX2NvbmZpZy5qc29uXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBvblVwZGF0ZUFuZFNhdmUoKSB7XHJcbiAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gb25VcGRhdGVBbmRTYXZlKCkgc3RhcnRlZCcpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gMS4gVmFsaWRhdGUgYXNzZXRzXHJcbiAgICAgICAgY29uc3QgY29uZmlnQXNzZXRWYWx1ZSA9IF9wYW5lbC5kdW1wPy52YWx1ZT8uY29uZmlnQXNzZXQ/LnZhbHVlO1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZUFzc2V0VmFsdWUgPSBfcGFuZWwuZHVtcD8udmFsdWU/LnVwZGF0ZUNvbmZpZ0Fzc2V0Py52YWx1ZTtcclxuXHJcbiAgICAgICAgaWYgKCFjb25maWdBc3NldFZhbHVlKSB7XHJcbiAgICAgICAgICAgIHNob3dFcnJvcignRXJyb3I6IENvbmZpZyBBc3NldCByZXF1aXJlZCcpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbSW5zcGVjdG9yXSBjb25maWdBc3NldCBpcyBOVUxMJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdXBkYXRlQXNzZXRWYWx1ZSkge1xyXG4gICAgICAgICAgICBzaG93RXJyb3IoJ0Vycm9yOiBVcGRhdGUgQ29uZmlnIEFzc2V0IHJlcXVpcmVkJyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIHVwZGF0ZUNvbmZpZ0Fzc2V0IGlzIE5VTEwnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gUmVhZCBKU09OIGRhdGFcclxuICAgICAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gUmVhZGluZyBjb25maWcgZGF0YS4uLicpO1xyXG5cclxuICAgICAgICAvLyAyYS4gR2V0IGNvbmZpZyBkYXRhIChjaGVjayBpZiAuanNvbiBhdmFpbGFibGUsIGVsc2UgcmVhZCBmaWxlKVxyXG4gICAgICAgIGxldCBjb25maWdEYXRhOiBhbnk7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0Fzc2V0VmFsdWUuanNvbikge1xyXG4gICAgICAgICAgICBjb25maWdEYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWdBc3NldFZhbHVlLmpzb24pKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFVzaW5nIGNvbmZpZ0Fzc2V0Lmpzb24gZnJvbSBkdW1wJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gUXVlcnkgYXNzZXQgaW5mbyBhbmQgcmVhZCBmaWxlXHJcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbzogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGNvbmZpZ0Fzc2V0VmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgIGxldCBmaWxlUGF0aCA9IGFzc2V0SW5mby5zb3VyY2U7XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6LycpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBmaWxlUGF0aC5zdWJzdHJpbmcoNCkucmVwbGFjZSgvXFwvL2csIHBhdGguc2VwKTtcclxuICAgICAgICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHJlbGF0aXZlUGF0aCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGpzb25Db250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgY29uZmlnRGF0YSA9IEpTT04ucGFyc2UoanNvbkNvbnRlbnQpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gUmVhZCBjb25maWdBc3NldCBmcm9tIGZpbGUnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDJiLiBHZXQgdXBkYXRlIGRhdGEgKGNoZWNrIGlmIC5qc29uIGF2YWlsYWJsZSwgZWxzZSByZWFkIGZpbGUpXHJcbiAgICAgICAgbGV0IHVwZGF0ZURhdGE6IGFueTtcclxuICAgICAgICBpZiAodXBkYXRlQXNzZXRWYWx1ZS5qc29uKSB7XHJcbiAgICAgICAgICAgIHVwZGF0ZURhdGEgPSB1cGRhdGVBc3NldFZhbHVlLmpzb247XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbSW5zcGVjdG9yXSBVc2luZyB1cGRhdGVBc3NldC5qc29uIGZyb20gZHVtcCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIFF1ZXJ5IGFzc2V0IGluZm8gYW5kIHJlYWQgZmlsZVxyXG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm86IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCB1cGRhdGVBc3NldFZhbHVlLnV1aWQpO1xyXG4gICAgICAgICAgICBsZXQgZmlsZVBhdGggPSBhc3NldEluZm8uc291cmNlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGZpbGVQYXRoLnN0YXJ0c1dpdGgoJ2RiOi8nKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gZmlsZVBhdGguc3Vic3RyaW5nKDQpLnJlcGxhY2UoL1xcLy9nLCBwYXRoLnNlcCk7XHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCByZWxhdGl2ZVBhdGgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBqc29uQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgIHVwZGF0ZURhdGEgPSBKU09OLnBhcnNlKGpzb25Db250ZW50KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFJlYWQgdXBkYXRlQXNzZXQgZnJvbSBmaWxlJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gQ29uZmlnIGRhdGE6JywgY29uZmlnRGF0YSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFVwZGF0ZSBkYXRhOicsIHVwZGF0ZURhdGEpO1xyXG5cclxuICAgICAgICAvLyAzLiBEZWVwIG1lcmdlXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFN0YXJ0aW5nIGRlZXAgbWVyZ2UuLi4nKTtcclxuICAgICAgICBkZWVwTWVyZ2UoY29uZmlnRGF0YSwgdXBkYXRlRGF0YSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIE1lcmdlIGNvbXBsZXRlZDonLCBjb25maWdEYXRhKTtcclxuXHJcbiAgICAgICAgLy8gNC4gU2F2ZSB0byBmaWxlXHJcbiAgICAgICAgYXdhaXQgc2F2ZUNvbmZpZ1RvRmlsZShjb25maWdBc3NldFZhbHVlLnV1aWQsIGNvbmZpZ0RhdGEpO1xyXG5cclxuICAgICAgICAvLyA1LiBVcGRhdGUgcGFuZWwgc3RhdGVcclxuICAgICAgICBfcGFuZWwuY29uZmlnRGF0YSA9IGNvbmZpZ0RhdGE7XHJcbiAgICAgICAgX3BhbmVsLmVkaXRlZERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZ0RhdGEpKTtcclxuICAgICAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICAgICAgX3BhbmVsLmlzTW9kaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gNi4gUmVidWlsZCBjYWNoZSBhbmQgVUlcclxuICAgICAgICBidWlsZExldmVsc0NhY2hlKF9wYW5lbC5lZGl0ZWREYXRhKTtcclxuICAgICAgICByZW5kZXJMZXZlbDEoKTtcclxuXHJcbiAgICAgICAgc2hvd1N1Y2Nlc3MoJ1VwZGF0ZWQgJiBTYXZlZCDinJMnKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gb25VcGRhdGVBbmRTYXZlKCkgY29tcGxldGVkJyk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbSW5zcGVjdG9yXSBVcGRhdGUgJiBTYXZlIGZhaWxlZDonLCBlcnIpO1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIEVycm9yIG1lc3NhZ2U6JywgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIHNob3dFcnJvcignVXBkYXRlICYgU2F2ZSBGYWlsZWQg4pyXJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogU2F2ZSBDb25maWc6IFNhdmUgZWRpdGVkRGF0YSB04burIENvbmZpZyBCcm93c2VyIHbDoG8gZ2FtZV9jb25maWcuanNvblxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gb25TYXZlQ29uZmlnKCkge1xyXG4gICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIG9uU2F2ZUNvbmZpZygpIHN0YXJ0ZWQnKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIC8vIDEuIFZhbGlkYXRlIGVkaXRlZERhdGFcclxuICAgICAgICBpZiAoIV9wYW5lbC5lZGl0ZWREYXRhKSB7XHJcbiAgICAgICAgICAgIHNob3dFcnJvcignRXJyb3I6IE5vIGNvbmZpZyBsb2FkZWQnKTtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0luc3BlY3Rvcl0gZWRpdGVkRGF0YSBpcyBOVUxMJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbmZpZ0Fzc2V0VmFsdWUgPSBfcGFuZWwuZHVtcD8udmFsdWU/LmNvbmZpZ0Fzc2V0Py52YWx1ZTtcclxuICAgICAgICBpZiAoIWNvbmZpZ0Fzc2V0VmFsdWUpIHtcclxuICAgICAgICAgICAgc2hvd0Vycm9yKCdFcnJvcjogQ29uZmlnIEFzc2V0IHJlcXVpcmVkJyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIGNvbmZpZ0Fzc2V0IGlzIE5VTEwnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFNhdmluZyBlZGl0ZWREYXRhOicsIF9wYW5lbC5lZGl0ZWREYXRhKTtcclxuXHJcbiAgICAgICAgLy8gMi4gU2F2ZSBlZGl0ZWREYXRhIHRvIGZpbGVcclxuICAgICAgICBhd2FpdCBzYXZlQ29uZmlnVG9GaWxlKGNvbmZpZ0Fzc2V0VmFsdWUudXVpZCwgX3BhbmVsLmVkaXRlZERhdGEpO1xyXG5cclxuICAgICAgICAvLyAzLiBVcGRhdGUgcGFuZWwgc3RhdGVcclxuICAgICAgICBfcGFuZWwuY29uZmlnRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoX3BhbmVsLmVkaXRlZERhdGEpKTtcclxuICAgICAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBzaG93U3VjY2VzcygnQ29uZmlnIFNhdmVkIOKckycpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbSW5zcGVjdG9yXSBvblNhdmVDb25maWcoKSBjb21wbGV0ZWQnKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIFNhdmUgQ29uZmlnIGZhaWxlZDonLCBlcnIpO1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIEVycm9yIG1lc3NhZ2U6JywgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgIHNob3dFcnJvcignU2F2ZSBDb25maWcgRmFpbGVkIOKclycpO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gb25Mb2FkQ29uZmlnKCkge1xyXG4gICAgLy8gS2nhu4NtIHRyYSB4ZW0gxJHDoyBrw6lvIGNvbmZpZyBhc3NldCB2w6BvIGNoxrBhIChwcmlvcml0aXplIGV4aXN0aW5nIGFzc2V0KVxyXG4gICAgY29uc3QgY29uZmlnQXNzZXRWYWx1ZSA9IF9wYW5lbC5kdW1wPy52YWx1ZT8uY29uZmlnQXNzZXQ/LnZhbHVlO1xyXG4gICAgY29uc3QgdXBkYXRlQXNzZXRWYWx1ZSA9IF9wYW5lbC5kdW1wPy52YWx1ZT8udXBkYXRlQ29uZmlnQXNzZXQ/LnZhbHVlO1xyXG5cclxuICAgIC8vIE7hur91IMSRw6MgY8OzIGNvbmZpZ0Fzc2V0IGhv4bq3YyB1cGRhdGVBc3NldCAoa2jDtG5nIG51bGwpLCBz4butIGThu6VuZyBsdcO0blxyXG4gICAgbGV0IGFzc2V0VVVJRDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgICBsZXQgY29uZmlnRGF0YTogYW55ID0gbnVsbDtcclxuXHJcbiAgICBpZiAoY29uZmlnQXNzZXRWYWx1ZSAmJiBjb25maWdBc3NldFZhbHVlLnV1aWQpIHtcclxuICAgICAgICAvLyDEkMOjIGvDqW8gY29uZmlnQXNzZXQgdsOgbyDihpIgbOG6pXkgSlNPTiB04burIGFzc2V0IMSRw7MgbHXDtG5cclxuICAgICAgICBhc3NldFVVSUQgPSBjb25maWdBc3NldFZhbHVlLnV1aWQ7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0Fzc2V0VmFsdWUuanNvbikge1xyXG4gICAgICAgICAgICBjb25maWdEYXRhID0gY29uZmlnQXNzZXRWYWx1ZS5qc29uO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW0luc3BlY3Rvcl0gU+G7rSBk4bulbmcgY29uZmlnQXNzZXQgxJHDoyBrw6lvIHbDoG8gKGtow7RuZyBxdWVyeSBs4bqhaSknKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHVwZGF0ZUFzc2V0VmFsdWUgJiYgdXBkYXRlQXNzZXRWYWx1ZS51dWlkKSB7XHJcbiAgICAgICAgLy8gTuG6v3UgY2jGsGEgY8OzIGNvbmZpZ0Fzc2V0IG5oxrBuZyBjw7MgdXBkYXRlQXNzZXQg4oaSIGTDuW5nIHVwZGF0ZUFzc2V0XHJcbiAgICAgICAgYXNzZXRVVUlEID0gdXBkYXRlQXNzZXRWYWx1ZS51dWlkO1xyXG4gICAgICAgIGlmICh1cGRhdGVBc3NldFZhbHVlLmpzb24pIHtcclxuICAgICAgICAgICAgY29uZmlnRGF0YSA9IHVwZGF0ZUFzc2V0VmFsdWUuanNvbjtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tJbnNwZWN0b3JdIFPhu60gZOG7pW5nIHVwZGF0ZUNvbmZpZ0Fzc2V0IMSRw6Mga8OpbyB2w6BvIChraMO0bmcgcXVlcnkgbOG6oWkpJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIE7hur91IGtow7RuZyBjw7MgYXNzZXQgbsOgbyDEkcaw4bujYyBrw6lvIHbDoG9cclxuICAgIGlmICghYXNzZXRVVUlEKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzUHJvcC5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gJ0Vycm9yOiBQbGVhc2UgZHJhZyBKU09OIGZpbGUgdG8gQ29uZmlnIEFzc2V0JztcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnN0eWxlLmNvbG9yID0gJyNGNDQzMzYnO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb21wVVVJRCA9IF9wYW5lbC5kdW1wPy52YWx1ZT8udXVpZDtcclxuICAgIGlmICghY29tcFVVSUQpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbSW5zcGVjdG9yXSBDb21wb25lbnQgVVVJRCBub3QgZm91bmQnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gMS4gQ2FsbCBjb21wb25lbnQubG9hZEFuZEFwcGx5Q29uZmlnKClcclxuICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ2V4ZWN1dGUtY29tcG9uZW50LW1ldGhvZCcsIHtcclxuICAgICAgICB1dWlkOiBjb21wVVVJRCxcclxuICAgICAgICBuYW1lOiAnbG9hZEFuZEFwcGx5Q29uZmlnJyxcclxuICAgICAgICBhcmdzOiBbXVxyXG4gICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gMi4gTuG6v3UgxJHDoyBjw7MgY29uZmlnRGF0YSB04burIGFzc2V0ICjEkcOjIGvDqW8gdsOgbyksIHNraXAgcXVlcnkgdsOgIHJlYWQgZmlsZVxyXG4gICAgICAgIGlmIChjb25maWdEYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIEJ1aWxkIGNvbmZpZyBicm93c2VyIHRy4buxYyB0aeG6v3BcclxuICAgICAgICAgICAgX3BhbmVsLmNvbmZpZ0RhdGEgPSBjb25maWdEYXRhO1xyXG4gICAgICAgICAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnRGF0YSkpO1xyXG4gICAgICAgICAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICAgICAgICAgIF9wYW5lbC5pc01vZGlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBidWlsZExldmVsc0NhY2hlKF9wYW5lbC5lZGl0ZWREYXRhKTtcclxuXHJcbiAgICAgICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1Byb3AuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSAnTG9hZGVkIOKckyc7XHJcbiAgICAgICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnIzRDQUY1MCc7XHJcblxyXG4gICAgICAgICAgICByZW5kZXJMZXZlbDEoKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOyAvLyBTa2lwIC50aGVuKCkgY2hhaW5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDMuIE7hur91IGNoxrBhIGPDsyBjb25maWdEYXRhLCBxdWVyeSBhc3NldCBpbmZvIChmYWxsYmFjayBsb2dpYyBjxakpXHJcbiAgICAgICAgcmV0dXJuIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhc3NldFVVSUQpO1xyXG4gICAgfSkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcclxuICAgICAgICAvLyBO4bq/dSDEkcOjIGxvYWQgdOG7qyBjb25maWdEYXRhLCBza2lwIGLGsOG7m2MgbsOgeVxyXG4gICAgICAgIGlmIChjb25maWdEYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghYXNzZXRJbmZvIHx8ICFhc3NldEluZm8uc291cmNlKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXQgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZmlsZVBhdGggPSBhc3NldEluZm8uc291cmNlO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGRiOi8vIHBhdGhcclxuICAgICAgICBpZiAoZmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6LycpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGZpbGVQYXRoLnN1YnN0cmluZyg0KS5yZXBsYWNlKC9cXC8vZywgcGF0aC5zZXApO1xyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCByZWxhdGl2ZVBhdGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVhZCBKU09OIGZpbGVcclxuICAgICAgICBjb25zdCBqc29uQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgY29uZmlnRGF0YSA9IEpTT04ucGFyc2UoanNvbkNvbnRlbnQpO1xyXG5cclxuICAgICAgICAvLyBCdWlsZCBjb25maWcgYnJvd3NlclxyXG4gICAgICAgIF9wYW5lbC5jb25maWdEYXRhID0gY29uZmlnRGF0YTtcclxuICAgICAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnRGF0YSkpO1xyXG4gICAgICAgIF9wYW5lbC5zZWxlY3RlZFBhdGggPSBbXTtcclxuICAgICAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBidWlsZExldmVsc0NhY2hlKF9wYW5lbC5lZGl0ZWREYXRhKTtcclxuXHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzUHJvcC5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gJ0xvYWRlZCDinJMnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnIzRDQUY1MCc7XHJcblxyXG4gICAgICAgIHJlbmRlckxldmVsMSgpO1xyXG5cclxuICAgIH0pLmNhdGNoKChlcnI6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tJbnNwZWN0b3JdIExvYWQgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSAnTG9hZCBGYWlsZWQg4pyXJztcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnN0eWxlLmNvbG9yID0gJyNGNDQzMzYnO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBEZWVwIG1lcmdlIHNvdXJjZSB2w6BvIHRhcmdldFxyXG4gKi9cclxuZnVuY3Rpb24gZGVlcE1lcmdlKHRhcmdldDogYW55LCBzb3VyY2U6IGFueSk6IHZvaWQge1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gc291cmNlKSB7XHJcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2Vba2V5XSAmJiB0eXBlb2Ygc291cmNlW2tleV0gPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHNvdXJjZVtrZXldKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gTuG6v3UgbMOgIG9iamVjdCB2w6AgY2jGsGEgdOG7k24gdOG6oWkgdHJvbmcgdGFyZ2V0IOKGkiB04bqhbyBt4bubaVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXRba2V5XSB8fCB0eXBlb2YgdGFyZ2V0W2tleV0gIT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSB7fTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIMSQ4buHIHF1eSBtZXJnZSB2w6BvIG9iamVjdCBjb25cclxuICAgICAgICAgICAgICAgIGRlZXBNZXJnZSh0YXJnZXRba2V5XSwgc291cmNlW2tleV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gUHJpbWl0aXZlIHZhbHVlIGhv4bq3YyBhcnJheSDihpIgZ2hpIMSRw6ggdHLhu7FjIHRp4bq/cFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRMZXZlbHNDYWNoZShkYXRhOiBhbnksIHBhdGhQcmVmaXg6IHN0cmluZ1tdID0gW10pIHtcclxuICAgIGNvbnN0IHBhdGhLZXkgPSBwYXRoUHJlZml4LmpvaW4oJy4nKTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIGRhdGEgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoZGF0YSkpIHtcclxuICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoZGF0YSk7XHJcblxyXG4gICAgICAgIF9wYW5lbC5sZXZlbHNDYWNoZVtwYXRoS2V5XSA9IHtcclxuICAgICAgICAgICAgb3B0aW9uczoga2V5cyxcclxuICAgICAgICAgICAgcGF0aDogcGF0aFByZWZpeCxcclxuICAgICAgICAgICAgZGF0YTogZGF0YVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuZXdQYXRoID0gWy4uLnBhdGhQcmVmaXgsIGtleV07XHJcbiAgICAgICAgICAgIGJ1aWxkTGV2ZWxzQ2FjaGUoZGF0YVtrZXldLCBuZXdQYXRoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyTGV2ZWwxKCkge1xyXG4gICAgY29uc3QgY2FjaGVFbnRyeSA9IF9wYW5lbC5sZXZlbHNDYWNoZVsnJ107XHJcbiAgICBpZiAoY2FjaGVFbnRyeSkge1xyXG4gICAgICAgIHJlbmRlckRyb3Bkb3duKDAsIGNhY2hlRW50cnkub3B0aW9ucyk7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuYnJlYWRjcnVtYlByb3AuaGlkZGVuID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyRHJvcGRvd24obGV2ZWw6IG51bWJlciwgb3B0aW9uczogc3RyaW5nW10pIHtcclxuICAgIHdoaWxlICgoX3BhbmVsIGFzIGFueSkuJC5kcm9wZG93bnNDb250YWluZXIuY2hpbGRyZW4ubGVuZ3RoID4gbGV2ZWwpIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5kcm9wZG93bnNDb250YWluZXIubGFzdENoaWxkLnJlbW92ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnZhbHVlc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuXHJcbiAgICBjb25zdCBwcm9wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktcHJvcCcpO1xyXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1sYWJlbCcpO1xyXG4gICAgbGFiZWwuc2xvdCA9ICdsYWJlbCc7XHJcbiAgICBsYWJlbC50ZXh0Q29udGVudCA9IGBMZXZlbCAke2xldmVsICsgMX1gO1xyXG5cclxuICAgIGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VpLXNlbGVjdCcpO1xyXG4gICAgc2VsZWN0LnNsb3QgPSAnY29udGVudCc7XHJcblxyXG4gICAgY29uc3QgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgIHBsYWNlaG9sZGVyLnZhbHVlID0gJyc7XHJcbiAgICBwbGFjZWhvbGRlci50ZXh0Q29udGVudCA9ICctLSBTZWxlY3QgLS0nO1xyXG4gICAgc2VsZWN0LmFwcGVuZENoaWxkKHBsYWNlaG9sZGVyKTtcclxuXHJcbiAgICBvcHRpb25zLmZvckVhY2gob3B0ID0+IHtcclxuICAgICAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcclxuICAgICAgICBvcHRpb24udmFsdWUgPSBvcHQ7XHJcbiAgICAgICAgb3B0aW9uLnRleHRDb250ZW50ID0gb3B0O1xyXG4gICAgICAgIHNlbGVjdC5hcHBlbmRDaGlsZChvcHRpb24pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgc2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlOiBhbnkpID0+IHtcclxuICAgICAgICBjb25zdCBzZWxlY3RlZEtleSA9IGUudGFyZ2V0LnZhbHVlO1xyXG4gICAgICAgIGlmIChzZWxlY3RlZEtleSkge1xyXG4gICAgICAgICAgICBvblNlbGVjdEZpZWxkKGxldmVsLCBzZWxlY3RlZEtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcHJvcC5hcHBlbmRDaGlsZChsYWJlbCk7XHJcbiAgICBwcm9wLmFwcGVuZENoaWxkKHNlbGVjdCk7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5kcm9wZG93bnNDb250YWluZXIuYXBwZW5kQ2hpbGQocHJvcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uU2VsZWN0RmllbGQobGV2ZWw6IG51bWJlciwga2V5OiBzdHJpbmcpIHtcclxuICAgIF9wYW5lbC5zZWxlY3RlZFBhdGggPSBfcGFuZWwuc2VsZWN0ZWRQYXRoLnNsaWNlKDAsIGxldmVsKTtcclxuICAgIF9wYW5lbC5zZWxlY3RlZFBhdGgucHVzaChrZXkpO1xyXG5cclxuICAgIHVwZGF0ZUJyZWFkY3J1bWIoKTtcclxuXHJcbiAgICB3aGlsZSAoKF9wYW5lbCBhcyBhbnkpLiQuZHJvcGRvd25zQ29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCA+IGxldmVsICsgMSkge1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmRyb3Bkb3duc0NvbnRhaW5lci5sYXN0Q2hpbGQucmVtb3ZlKCk7XHJcbiAgICB9XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC52YWx1ZXNDb250YWluZXIuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gICAgY29uc3QgcGF0aEtleSA9IF9wYW5lbC5zZWxlY3RlZFBhdGguam9pbignLicpO1xyXG4gICAgY29uc3QgY2FjaGVFbnRyeSA9IF9wYW5lbC5sZXZlbHNDYWNoZVtwYXRoS2V5XTtcclxuXHJcbiAgICBpZiAoY2FjaGVFbnRyeSAmJiBjYWNoZUVudHJ5Lm9wdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBoYXNPbmx5UHJpbWl0aXZlcyA9IGNhY2hlRW50cnkub3B0aW9ucy5ldmVyeSgoazogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IGNhY2hlRW50cnkuZGF0YVtrXTtcclxuICAgICAgICAgICAgY29uc3QgdmFsVHlwZSA9IHR5cGVvZiB2YWw7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWxUeXBlID09PSAnbnVtYmVyJyB8fCB2YWxUeXBlID09PSAnc3RyaW5nJyB8fCB2YWxUeXBlID09PSAnYm9vbGVhbicgfHwgdmFsID09PSBudWxsO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZW5kZXJEcm9wZG93bihsZXZlbCArIDEsIGNhY2hlRW50cnkub3B0aW9ucyk7XHJcblxyXG4gICAgICAgIGlmIChoYXNPbmx5UHJpbWl0aXZlcykge1xyXG4gICAgICAgICAgICByZW5kZXJWYWx1ZXMoY2FjaGVFbnRyeS5kYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjdXJyZW50ID0gX3BhbmVsLmVkaXRlZERhdGE7XHJcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIF9wYW5lbC5zZWxlY3RlZFBhdGgpIHtcclxuICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRba107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlbmRlclZhbHVlcyh7IFtrZXldOiBjdXJyZW50IH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCcmVhZGNydW1iKCkge1xyXG4gICAgaWYgKF9wYW5lbC5zZWxlY3RlZFBhdGgubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmJyZWFkY3J1bWJQcm9wLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmJyZWFkY3J1bWIudGV4dENvbnRlbnQgPSBfcGFuZWwuc2VsZWN0ZWRQYXRoLmpvaW4oJyAvICcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5icmVhZGNydW1iUHJvcC5oaWRkZW4gPSB0cnVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXJWYWx1ZXMob2JqOiBhbnkpIHtcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnZhbHVlc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuXHJcbiAgICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IG9ialtrZXldO1xyXG4gICAgICAgIGNvbnN0IHByb3AgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1wcm9wJyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktbGFiZWwnKTtcclxuICAgICAgICBsYWJlbC5zbG90ID0gJ2xhYmVsJztcclxuICAgICAgICBsYWJlbC50ZXh0Q29udGVudCA9IGtleTtcclxuXHJcbiAgICAgICAgbGV0IGlucHV0OiBhbnk7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1udW0taW5wdXQnKTtcclxuICAgICAgICAgICAgaW5wdXQudmFsdWUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgLy8gRWRpdGFibGUgLSB0cmFjayBjaGFuZ2VzXHJcbiAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIG9uVmFsdWVDaGFuZ2Uoa2V5LCBwYXJzZUZsb2F0KGUudGFyZ2V0LnZhbHVlKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcclxuICAgICAgICAgICAgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1jaGVja2JveCcpO1xyXG4gICAgICAgICAgICBpbnB1dC5jaGVja2VkID0gdmFsdWU7XHJcbiAgICAgICAgICAgIC8vIEVkaXRhYmxlIC0gdHJhY2sgY2hhbmdlc1xyXG4gICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvblZhbHVlQ2hhbmdlKGtleSwgZS50YXJnZXQuY2hlY2tlZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktaW5wdXQnKTtcclxuICAgICAgICAgICAgaW5wdXQudmFsdWUgPSB2YWx1ZSAhPT0gbnVsbCA/IFN0cmluZyh2YWx1ZSkgOiAnJztcclxuICAgICAgICAgICAgLy8gRWRpdGFibGUgLSB0cmFjayBjaGFuZ2VzXHJcbiAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIG9uVmFsdWVDaGFuZ2Uoa2V5LCBlLnRhcmdldC52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5wdXQuc2xvdCA9ICdjb250ZW50JztcclxuXHJcbiAgICAgICAgcHJvcC5hcHBlbmRDaGlsZChsYWJlbCk7XHJcbiAgICAgICAgcHJvcC5hcHBlbmRDaGlsZChpbnB1dCk7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQudmFsdWVzQ29udGFpbmVyLmFwcGVuZENoaWxkKHByb3ApO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgdmFsdWUgY2hhbmdlIC0gdXBkYXRlIGVkaXRlZERhdGEg4bufIGRlZXAgbmVzdGVkIHBhdGhcclxuICovXHJcbmZ1bmN0aW9uIG9uVmFsdWVDaGFuZ2Uoa2V5OiBzdHJpbmcsIG5ld1ZhbHVlOiBhbnkpIHtcclxuICAgIC8vIE5hdmlnYXRlIHRvIGN1cnJlbnQgcGF0aCB0cm9uZyBlZGl0ZWREYXRhXHJcbiAgICBsZXQgY3VycmVudCA9IF9wYW5lbC5lZGl0ZWREYXRhO1xyXG4gICAgZm9yIChjb25zdCBwYXRoS2V5IG9mIF9wYW5lbC5zZWxlY3RlZFBhdGgpIHtcclxuICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXRoS2V5XTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVcGRhdGUgdmFsdWVcclxuICAgIGN1cnJlbnRba2V5XSA9IG5ld1ZhbHVlO1xyXG4gICAgX3BhbmVsLmlzTW9kaWZpZWQgPSB0cnVlO1xyXG59XHJcbiJdfQ==