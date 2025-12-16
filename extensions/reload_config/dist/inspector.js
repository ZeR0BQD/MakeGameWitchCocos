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
</ui-section>
`;
exports.$ = {
    configAssetProp: '#config-asset-prop',
    updateAssetProp: '#update-asset-prop',
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
        _panel.$.updateBtn.addEventListener('click', onUpdateConfig);
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
function onLoadConfig() {
    var _a, _b, _c, _d, _e, _f;
    // Đọc UUID từ component dump
    const assetUUID = (_d = (_c = (_b = (_a = _panel.dump) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.configAsset) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.uuid;
    if (!assetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Please drag JSON file to Config Asset';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }
    const compUUID = (_f = (_e = _panel.dump) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f.uuid;
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
        // 2. Query asset info
        return Editor.Message.request('asset-db', 'query-asset-info', assetUUID);
    }).then((assetInfo) => {
        if (!assetInfo || !assetInfo.source) {
            throw new Error('Asset not found');
        }
        let filePath = assetInfo.source;
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
async function onUpdateConfig() {
    var _a, _b, _c, _d;
    // Đọc UUID từ dump
    const configAssetUUID = (_d = (_c = (_b = (_a = _panel.dump) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.configAsset) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.uuid;
    if (!configAssetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Config Asset required';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }
    // Check if there are changes to save
    if (!_panel.editedData) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: No config loaded';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }
    try {
        // 1. Get config file path
        const configAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', configAssetUUID);
        let configFilePath = configAssetInfo.source;
        // Convert db:// path
        if (configFilePath.startsWith('db:/')) {
            const relativePath = configFilePath.substring(4).replace(/\//g, path.sep);
            configFilePath = path.join(Editor.Project.path, relativePath);
        }
        // 2. Save editedData to file
        const jsonString = JSON.stringify(_panel.editedData, null, 4);
        fs.writeFileSync(configFilePath, jsonString, 'utf-8');
        // 3. Refresh asset database
        await Editor.Message.request('asset-db', 'refresh-asset', configAssetUUID);
        // 4. Update state
        _panel.configData = JSON.parse(JSON.stringify(_panel.editedData));
        _panel.isModified = false;
        // 5. Update UI
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Saved ✓';
        _panel.$.statusText.style.color = '#4CAF50';
    }
    catch (err) {
        console.error('[Inspector] Save failed:', err);
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Save Failed ✗';
        _panel.$.statusText.style.color = '#F44336';
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL2luc3BlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7OztBQW1GYixzQkFvQkM7QUFJRCx3QkFlQztBQWpIRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBSVosUUFBQSxRQUFRLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTBDdkIsQ0FBQztBQUVXLFFBQUEsQ0FBQyxHQUFHO0lBQ2IsZUFBZSxFQUFFLG9CQUFvQjtJQUNyQyxlQUFlLEVBQUUsb0JBQW9CO0lBQ3JDLFFBQVEsRUFBRSxZQUFZO0lBQ3RCLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFVBQVUsRUFBRSxjQUFjO0lBQzFCLFVBQVUsRUFBRSxjQUFjO0lBQzFCLGNBQWMsRUFBRSxrQkFBa0I7SUFDbEMsVUFBVSxFQUFFLGFBQWE7SUFDekIsa0JBQWtCLEVBQUUsc0JBQXNCO0lBQzFDLGVBQWUsRUFBRSxtQkFBbUI7Q0FDdkMsQ0FBQztBQVdGLElBQUksTUFBTSxHQUFtQixJQUFLLENBQUM7QUFFbkMsU0FBZ0IsS0FBSztJQUNqQixNQUFNLEdBQUcsSUFBVyxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBQzFCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBRXhCLGdCQUFnQjtJQUNoQixJQUFLLE1BQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENB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QUMsRUFBRSxDQUFDO1lBQ2xELDJCQUEyQjtZQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBTSxFQUFFLEVBQUU7Z0JBQ3hDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUV2QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsTUFBYyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQUMsR0FBVyxFQUFFLFFBQWE7SUFDN0MsNENBQTRDO0lBQzVDLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7SUFDaEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDeEMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsZUFBZTtJQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUM7SUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbi8vIFJlbW92ZWQgaW52YWxpZCBpbXBvcnQuIHJlbHlpbmcgb24gZ2xvYmFsIHR5cGVzIG9yICdhbnknIGZvciBzaW1wbGljaXR5IGluIHRoaXMgc2NyaXB0IGNvbnRleHQuXHJcbi8vIGltcG9ydCB7IElQYW5lbFRoaXMgfSBmcm9tIFwiQGNvY29zL2NyZWF0b3ItdHlwZXMvZWRpdG9yXCI7IFxyXG5cclxuLy8gRGVjbGFyZSByZXF1aXJlIHRvIGZpeCBUUyBlcnJvciBzaW5jZSBAdHlwZXMvbm9kZSBtaWdodCBub3QgYmUgaW5jbHVkZWQgaW4gdHNjb25maWcgdHlwZXMgbGlzdFxyXG5kZWNsYXJlIGNvbnN0IHJlcXVpcmU6IGFueTtcclxuZGVjbGFyZSBjb25zdCBFZGl0b3I6IGFueTtcclxuXHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuXHJcbnR5cGUgU2VsZWN0b3I8JD4gPSB7ICQ6IFJlY29yZDxrZXlvZiAkLCBhbnkgfCBudWxsPiB9XHJcblxyXG5leHBvcnQgY29uc3QgdGVtcGxhdGUgPSBgXHJcbjx1aS1wcm9wIHR5cGU9XCJkdW1wXCIgaWQ9XCJjb25maWctYXNzZXQtcHJvcFwiPjwvdWktcHJvcD5cclxuPHVpLXByb3AgdHlwZT1cImR1bXBcIiBpZD1cInVwZGF0ZS1hc3NldC1wcm9wXCI+PC91aS1wcm9wPlxyXG5cclxuPHVpLXByb3A+XHJcbiAgICA8dWktbGFiZWwgc2xvdD1cImxhYmVsXCI+QWN0aW9uczwvdWktbGFiZWw+XHJcbiAgICA8ZGl2IHNsb3Q9XCJjb250ZW50XCIgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBnYXA6IDVweDtcIj5cclxuICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCI+XHJcbiAgICAgICAgICAgIDx1aS1idXR0b24gaWQ9XCJjbGVhci1idG5cIj5cclxuICAgICAgICAgICAgICAgIDx1aS1pY29uIHZhbHVlPVwidHJhc2hcIj48L3VpLWljb24+XHJcbiAgICAgICAgICAgICAgICBDbGVhclxyXG4gICAgICAgICAgICA8L3VpLWJ1dHRvbj5cclxuICAgICAgICAgICAgPHVpLWJ1dHRvbiBjbGFzcz1cImJsdWVcIiBpZD1cImxvYWQtYnRuXCI+XHJcbiAgICAgICAgICAgICAgICA8dWktaWNvbiB2YWx1ZT1cImRvd25sb2FkXCI+PC91aS1pY29uPlxyXG4gICAgICAgICAgICAgICAgTG9hZFxyXG4gICAgICAgICAgICA8L3VpLWJ1dHRvbj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCI+XHJcbiAgICAgICAgICAgIDx1aS1idXR0b24gY2xhc3M9XCJvcmFuZ2VcIiBpZD1cInVwZGF0ZS1idG5cIiBzdHlsZT1cImZsZXg6IDE7XCI+XHJcbiAgICAgICAgICAgICAgICA8dWktaWNvbiB2YWx1ZT1cInJlZnJlc2hcIj48L3VpLWljb24+XHJcbiAgICAgICAgICAgICAgICBVcGRhdGUgJiBTYXZlXHJcbiAgICAgICAgICAgIDwvdWktYnV0dG9uPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbjwvdWktcHJvcD5cclxuXHJcbjx1aS1wcm9wIGlkPVwic3RhdHVzLXByb3BcIiBoaWRkZW4+XHJcbiAgICA8dWktbGFiZWwgc2xvdD1cImxhYmVsXCI+U3RhdHVzPC91aS1sYWJlbD5cclxuICAgIDxkaXYgc2xvdD1cImNvbnRlbnRcIiBpZD1cInN0YXR1cy10ZXh0XCI+Tm90IExvYWRlZDwvZGl2PlxyXG48L3VpLXByb3A+XHJcblxyXG48dWktc2VjdGlvbiBpZD1cImNvbmZpZy1icm93c2VyXCIgZXhwYW5kIGNhY2hlLWV4cGFuZD1cImNvbmZpZy1sb2FkZXItYnJvd3NlclwiPlxyXG4gICAgPGRpdiBzbG90PVwiaGVhZGVyXCI+Q29uZmlnIEJyb3dzZXI8L2Rpdj5cclxuICAgIFxyXG4gICAgPHVpLXByb3AgaWQ9XCJicmVhZGNydW1iLXByb3BcIiBoaWRkZW4+XHJcbiAgICAgICAgPHVpLWxhYmVsIHNsb3Q9XCJsYWJlbFwiPlBhdGg8L3VpLWxhYmVsPlxyXG4gICAgICAgIDxkaXYgc2xvdD1cImNvbnRlbnRcIiBpZD1cImJyZWFkY3J1bWJcIj48L2Rpdj5cclxuICAgIDwvdWktcHJvcD5cclxuICAgIFxyXG4gICAgPGRpdiBpZD1cImRyb3Bkb3ducy1jb250YWluZXJcIj48L2Rpdj5cclxuICAgIDxkaXYgaWQ9XCJ2YWx1ZXMtY29udGFpbmVyXCI+PC9kaXY+XHJcbjwvdWktc2VjdGlvbj5cclxuYDtcclxuXHJcbmV4cG9ydCBjb25zdCAkID0ge1xyXG4gICAgY29uZmlnQXNzZXRQcm9wOiAnI2NvbmZpZy1hc3NldC1wcm9wJyxcclxuICAgIHVwZGF0ZUFzc2V0UHJvcDogJyN1cGRhdGUtYXNzZXQtcHJvcCcsXHJcbiAgICBjbGVhckJ0bjogJyNjbGVhci1idG4nLFxyXG4gICAgbG9hZEJ0bjogJyNsb2FkLWJ0bicsXHJcbiAgICB1cGRhdGVCdG46ICcjdXBkYXRlLWJ0bicsXHJcbiAgICBzdGF0dXNQcm9wOiAnI3N0YXR1cy1wcm9wJyxcclxuICAgIHN0YXR1c1RleHQ6ICcjc3RhdHVzLXRleHQnLFxyXG4gICAgYnJlYWRjcnVtYlByb3A6ICcjYnJlYWRjcnVtYi1wcm9wJyxcclxuICAgIGJyZWFkY3J1bWI6ICcjYnJlYWRjcnVtYicsXHJcbiAgICBkcm9wZG93bnNDb250YWluZXI6ICcjZHJvcGRvd25zLWNvbnRhaW5lcicsXHJcbiAgICB2YWx1ZXNDb250YWluZXI6ICcjdmFsdWVzLWNvbnRhaW5lcidcclxufTtcclxuXHJcbmludGVyZmFjZSBJbnNwZWN0b3JQYW5lbCB7XHJcbiAgICBjb25maWdEYXRhOiBhbnk7XHJcbiAgICBlZGl0ZWREYXRhOiBhbnk7XHJcbiAgICBzZWxlY3RlZFBhdGg6IHN0cmluZ1tdO1xyXG4gICAgaXNNb2RpZmllZDogYm9vbGVhbjtcclxuICAgIGxldmVsc0NhY2hlOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgZHVtcDogYW55O1xyXG59XHJcblxyXG5sZXQgX3BhbmVsOiBJbnNwZWN0b3JQYW5lbCA9IG51bGwhO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWR5KHRoaXM6IGFueSkge1xyXG4gICAgX3BhbmVsID0gdGhpcyBhcyBhbnk7XHJcbiAgICBfcGFuZWwuY29uZmlnRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgX3BhbmVsLmxldmVsc0NhY2hlID0ge307XHJcblxyXG4gICAgLy8gQnV0dG9uIGV2ZW50c1xyXG4gICAgaWYgKChfcGFuZWwgYXMgYW55KS4kLmNsZWFyQnRuKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuY2xlYXJCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvbkNsZWFyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoKF9wYW5lbCBhcyBhbnkpLiQubG9hZEJ0bikge1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmxvYWRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvbkxvYWRDb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICgoX3BhbmVsIGFzIGFueSkuJC51cGRhdGVCdG4pIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC51cGRhdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvblVwZGF0ZUNvbmZpZyk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZSh0aGlzOiBhbnksIGR1bXA6IGFueSkge1xyXG4gICAgdGhpcy5kdW1wID0gZHVtcDtcclxuXHJcbiAgICAvLyBSZW5kZXIgY29tcG9uZW50IHByb3BlcnRpZXMgdG8gdWktcHJvcCB0eXBlPVwiZHVtcFwiIGVsZW1lbnRzXHJcbiAgICBpZiAoZHVtcCAmJiBkdW1wLnZhbHVlKSB7XHJcbiAgICAgICAgLy8gUmVuZGVyIGNvbmZpZ0Fzc2V0IHByb3BlcnR5XHJcbiAgICAgICAgaWYgKHRoaXMuJC5jb25maWdBc3NldFByb3AgJiYgZHVtcC52YWx1ZS5jb25maWdBc3NldCkge1xyXG4gICAgICAgICAgICB0aGlzLiQuY29uZmlnQXNzZXRQcm9wLnJlbmRlcihkdW1wLnZhbHVlLmNvbmZpZ0Fzc2V0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbmRlciB1cGRhdGVDb25maWdBc3NldCBwcm9wZXJ0eVxyXG4gICAgICAgIGlmICh0aGlzLiQudXBkYXRlQXNzZXRQcm9wICYmIGR1bXAudmFsdWUudXBkYXRlQ29uZmlnQXNzZXQpIHtcclxuICAgICAgICAgICAgdGhpcy4kLnVwZGF0ZUFzc2V0UHJvcC5yZW5kZXIoZHVtcC52YWx1ZS51cGRhdGVDb25maWdBc3NldCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gb25DbGVhcigpIHtcclxuICAgIC8vIENsZWFyIHBhbmVsIHN0YXRlXHJcbiAgICBfcGFuZWwuY29uZmlnRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuZWRpdGVkRGF0YSA9IG51bGw7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gW107XHJcbiAgICBfcGFuZWwuaXNNb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgX3BhbmVsLmxldmVsc0NhY2hlID0ge307XHJcblxyXG4gICAgLy8gQ2xlYXIgVUlcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLmRyb3Bkb3duc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLnZhbHVlc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgIChfcGFuZWwgYXMgYW55KS4kLmJyZWFkY3J1bWJQcm9wLmhpZGRlbiA9IHRydWU7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uTG9hZENvbmZpZygpIHtcclxuICAgIC8vIMSQ4buNYyBVVUlEIHThu6sgY29tcG9uZW50IGR1bXBcclxuICAgIGNvbnN0IGFzc2V0VVVJRCA9IF9wYW5lbC5kdW1wPy52YWx1ZT8uY29uZmlnQXNzZXQ/LnZhbHVlPy51dWlkO1xyXG5cclxuICAgIGlmICghYXNzZXRVVUlEKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzUHJvcC5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gJ0Vycm9yOiBQbGVhc2UgZHJhZyBKU09OIGZpbGUgdG8gQ29uZmlnIEFzc2V0JztcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnN0eWxlLmNvbG9yID0gJyNGNDQzMzYnO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb21wVVVJRCA9IF9wYW5lbC5kdW1wPy52YWx1ZT8udXVpZDtcclxuICAgIGlmICghY29tcFVVSUQpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbSW5zcGVjdG9yXSBDb21wb25lbnQgVVVJRCBub3QgZm91bmQnKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gMS4gQ2FsbCBjb21wb25lbnQubG9hZEFuZEFwcGx5Q29uZmlnKClcclxuICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ2V4ZWN1dGUtY29tcG9uZW50LW1ldGhvZCcsIHtcclxuICAgICAgICB1dWlkOiBjb21wVVVJRCxcclxuICAgICAgICBuYW1lOiAnbG9hZEFuZEFwcGx5Q29uZmlnJyxcclxuICAgICAgICBhcmdzOiBbXVxyXG4gICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gMi4gUXVlcnkgYXNzZXQgaW5mb1xyXG4gICAgICAgIHJldHVybiAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXNzZXRVVUlEKTtcclxuICAgIH0pLnRoZW4oKGFzc2V0SW5mbzogYW55KSA9PiB7XHJcbiAgICAgICAgaWYgKCFhc3NldEluZm8gfHwgIWFzc2V0SW5mby5zb3VyY2UpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NldCBub3QgZm91bmQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBmaWxlUGF0aCA9IGFzc2V0SW5mby5zb3VyY2U7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgZGI6Ly8gcGF0aFxyXG4gICAgICAgIGlmIChmaWxlUGF0aC5zdGFydHNXaXRoKCdkYjovJykpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gZmlsZVBhdGguc3Vic3RyaW5nKDQpLnJlcGxhY2UoL1xcLy9nLCBwYXRoLnNlcCk7XHJcbiAgICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHJlbGF0aXZlUGF0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAzLiBSZWFkIEpTT04gZmlsZVxyXG4gICAgICAgIGNvbnN0IGpzb25Db250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICBjb25zdCBjb25maWdEYXRhID0gSlNPTi5wYXJzZShqc29uQ29udGVudCk7XHJcblxyXG4gICAgICAgIC8vIDQuIEJ1aWxkIGNvbmZpZyBicm93c2VyXHJcbiAgICAgICAgX3BhbmVsLmNvbmZpZ0RhdGEgPSBjb25maWdEYXRhO1xyXG4gICAgICAgIF9wYW5lbC5lZGl0ZWREYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWdEYXRhKSk7XHJcbiAgICAgICAgX3BhbmVsLnNlbGVjdGVkUGF0aCA9IFtdO1xyXG4gICAgICAgIF9wYW5lbC5pc01vZGlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGJ1aWxkTGV2ZWxzQ2FjaGUoX3BhbmVsLmVkaXRlZERhdGEpO1xyXG5cclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSAnTG9hZGVkIOKckyc7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzVGV4dC5zdHlsZS5jb2xvciA9ICcjNENBRjUwJztcclxuXHJcbiAgICAgICAgcmVuZGVyTGV2ZWwxKCk7XHJcblxyXG4gICAgfSkuY2F0Y2goKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignW0luc3BlY3Rvcl0gTG9hZCBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1Byb3AuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9ICdMb2FkIEZhaWxlZCDinJcnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnI0Y0NDMzNic7XHJcbiAgICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gb25VcGRhdGVDb25maWcoKSB7XHJcbiAgICAvLyDEkOG7jWMgVVVJRCB04burIGR1bXBcclxuICAgIGNvbnN0IGNvbmZpZ0Fzc2V0VVVJRCA9IF9wYW5lbC5kdW1wPy52YWx1ZT8uY29uZmlnQXNzZXQ/LnZhbHVlPy51dWlkO1xyXG5cclxuICAgIGlmICghY29uZmlnQXNzZXRVVUlEKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzUHJvcC5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gJ0Vycm9yOiBDb25maWcgQXNzZXQgcmVxdWlyZWQnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnI0Y0NDMzNic7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIHRvIHNhdmVcclxuICAgIGlmICghX3BhbmVsLmVkaXRlZERhdGEpIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5zdGF0dXNQcm9wLmhpZGRlbiA9IGZhbHNlO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSAnRXJyb3I6IE5vIGNvbmZpZyBsb2FkZWQnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnI0Y0NDMzNic7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgLy8gMS4gR2V0IGNvbmZpZyBmaWxlIHBhdGhcclxuICAgICAgICBjb25zdCBjb25maWdBc3NldEluZm86IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBjb25maWdBc3NldFVVSUQpO1xyXG5cclxuICAgICAgICBsZXQgY29uZmlnRmlsZVBhdGggPSBjb25maWdBc3NldEluZm8uc291cmNlO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGRiOi8vIHBhdGhcclxuICAgICAgICBpZiAoY29uZmlnRmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6LycpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGNvbmZpZ0ZpbGVQYXRoLnN1YnN0cmluZyg0KS5yZXBsYWNlKC9cXC8vZywgcGF0aC5zZXApO1xyXG4gICAgICAgICAgICBjb25maWdGaWxlUGF0aCA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCByZWxhdGl2ZVBhdGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gU2F2ZSBlZGl0ZWREYXRhIHRvIGZpbGVcclxuICAgICAgICBjb25zdCBqc29uU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoX3BhbmVsLmVkaXRlZERhdGEsIG51bGwsIDQpO1xyXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoY29uZmlnRmlsZVBhdGgsIGpzb25TdHJpbmcsICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAvLyAzLiBSZWZyZXNoIGFzc2V0IGRhdGFiYXNlXHJcbiAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGNvbmZpZ0Fzc2V0VVVJRCk7XHJcblxyXG4gICAgICAgIC8vIDQuIFVwZGF0ZSBzdGF0ZVxyXG4gICAgICAgIF9wYW5lbC5jb25maWdEYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfcGFuZWwuZWRpdGVkRGF0YSkpO1xyXG4gICAgICAgIF9wYW5lbC5pc01vZGlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIDUuIFVwZGF0ZSBVSVxyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1Byb3AuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9ICdTYXZlZCDinJMnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnIzRDQUY1MCc7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbSW5zcGVjdG9yXSBTYXZlIGZhaWxlZDonLCBlcnIpO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1Byb3AuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9ICdTYXZlIEZhaWxlZCDinJcnO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnN0YXR1c1RleHQuc3R5bGUuY29sb3IgPSAnI0Y0NDMzNic7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogRGVlcCBtZXJnZSBzb3VyY2UgdsOgbyB0YXJnZXRcclxuICovXHJcbmZ1bmN0aW9uIGRlZXBNZXJnZSh0YXJnZXQ6IGFueSwgc291cmNlOiBhbnkpOiB2b2lkIHtcclxuICAgIGZvciAoY29uc3Qga2V5IGluIHNvdXJjZSkge1xyXG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICBpZiAoc291cmNlW2tleV0gJiYgdHlwZW9mIHNvdXJjZVtrZXldID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShzb3VyY2Vba2V5XSkpIHtcclxuICAgICAgICAgICAgICAgIC8vIE7hur91IGzDoCBvYmplY3QgdsOgIGNoxrBhIHThu5NuIHThuqFpIHRyb25nIHRhcmdldCDihpIgdOG6oW8gbeG7m2lcclxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0W2tleV0gfHwgdHlwZW9mIHRhcmdldFtrZXldICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0ge307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyDEkOG7hyBxdXkgbWVyZ2UgdsOgbyBvYmplY3QgY29uXHJcbiAgICAgICAgICAgICAgICBkZWVwTWVyZ2UodGFyZ2V0W2tleV0sIHNvdXJjZVtrZXldKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFByaW1pdGl2ZSB2YWx1ZSBob+G6t2MgYXJyYXkg4oaSIGdoaSDEkcOoIHRy4buxYyB0aeG6v3BcclxuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkTGV2ZWxzQ2FjaGUoZGF0YTogYW55LCBwYXRoUHJlZml4OiBzdHJpbmdbXSA9IFtdKSB7XHJcbiAgICBjb25zdCBwYXRoS2V5ID0gcGF0aFByZWZpeC5qb2luKCcuJyk7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhICE9PSBudWxsICYmICFBcnJheS5pc0FycmF5KGRhdGEpKSB7XHJcbiAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xyXG5cclxuICAgICAgICBfcGFuZWwubGV2ZWxzQ2FjaGVbcGF0aEtleV0gPSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnM6IGtleXMsXHJcbiAgICAgICAgICAgIHBhdGg6IHBhdGhQcmVmaXgsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbmV3UGF0aCA9IFsuLi5wYXRoUHJlZml4LCBrZXldO1xyXG4gICAgICAgICAgICBidWlsZExldmVsc0NhY2hlKGRhdGFba2V5XSwgbmV3UGF0aCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckxldmVsMSgpIHtcclxuICAgIGNvbnN0IGNhY2hlRW50cnkgPSBfcGFuZWwubGV2ZWxzQ2FjaGVbJyddO1xyXG4gICAgaWYgKGNhY2hlRW50cnkpIHtcclxuICAgICAgICByZW5kZXJEcm9wZG93bigwLCBjYWNoZUVudHJ5Lm9wdGlvbnMpO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLmJyZWFkY3J1bWJQcm9wLmhpZGRlbiA9IHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlckRyb3Bkb3duKGxldmVsOiBudW1iZXIsIG9wdGlvbnM6IHN0cmluZ1tdKSB7XHJcbiAgICB3aGlsZSAoKF9wYW5lbCBhcyBhbnkpLiQuZHJvcGRvd25zQ29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCA+IGxldmVsKSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuZHJvcGRvd25zQ29udGFpbmVyLmxhc3RDaGlsZC5yZW1vdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC52YWx1ZXNDb250YWluZXIuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gICAgY29uc3QgcHJvcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VpLXByb3AnKTtcclxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktbGFiZWwnKTtcclxuICAgIGxhYmVsLnNsb3QgPSAnbGFiZWwnO1xyXG4gICAgbGFiZWwudGV4dENvbnRlbnQgPSBgTGV2ZWwgJHtsZXZlbCArIDF9YDtcclxuXHJcbiAgICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1zZWxlY3QnKTtcclxuICAgIHNlbGVjdC5zbG90ID0gJ2NvbnRlbnQnO1xyXG5cclxuICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICBwbGFjZWhvbGRlci52YWx1ZSA9ICcnO1xyXG4gICAgcGxhY2Vob2xkZXIudGV4dENvbnRlbnQgPSAnLS0gU2VsZWN0IC0tJztcclxuICAgIHNlbGVjdC5hcHBlbmRDaGlsZChwbGFjZWhvbGRlcik7XHJcblxyXG4gICAgb3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XHJcbiAgICAgICAgb3B0aW9uLnZhbHVlID0gb3B0O1xyXG4gICAgICAgIG9wdGlvbi50ZXh0Q29udGVudCA9IG9wdDtcclxuICAgICAgICBzZWxlY3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHNlbGVjdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRLZXkgPSBlLnRhcmdldC52YWx1ZTtcclxuICAgICAgICBpZiAoc2VsZWN0ZWRLZXkpIHtcclxuICAgICAgICAgICAgb25TZWxlY3RGaWVsZChsZXZlbCwgc2VsZWN0ZWRLZXkpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHByb3AuYXBwZW5kQ2hpbGQobGFiZWwpO1xyXG4gICAgcHJvcC5hcHBlbmRDaGlsZChzZWxlY3QpO1xyXG4gICAgKF9wYW5lbCBhcyBhbnkpLiQuZHJvcGRvd25zQ29udGFpbmVyLmFwcGVuZENoaWxkKHByb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvblNlbGVjdEZpZWxkKGxldmVsOiBudW1iZXIsIGtleTogc3RyaW5nKSB7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoID0gX3BhbmVsLnNlbGVjdGVkUGF0aC5zbGljZSgwLCBsZXZlbCk7XHJcbiAgICBfcGFuZWwuc2VsZWN0ZWRQYXRoLnB1c2goa2V5KTtcclxuXHJcbiAgICB1cGRhdGVCcmVhZGNydW1iKCk7XHJcblxyXG4gICAgd2hpbGUgKChfcGFuZWwgYXMgYW55KS4kLmRyb3Bkb3duc0NvbnRhaW5lci5jaGlsZHJlbi5sZW5ndGggPiBsZXZlbCArIDEpIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5kcm9wZG93bnNDb250YWluZXIubGFzdENoaWxkLnJlbW92ZSgpO1xyXG4gICAgfVxyXG4gICAgKF9wYW5lbCBhcyBhbnkpLiQudmFsdWVzQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAgIGNvbnN0IHBhdGhLZXkgPSBfcGFuZWwuc2VsZWN0ZWRQYXRoLmpvaW4oJy4nKTtcclxuICAgIGNvbnN0IGNhY2hlRW50cnkgPSBfcGFuZWwubGV2ZWxzQ2FjaGVbcGF0aEtleV07XHJcblxyXG4gICAgaWYgKGNhY2hlRW50cnkgJiYgY2FjaGVFbnRyeS5vcHRpb25zKSB7XHJcbiAgICAgICAgY29uc3QgaGFzT25seVByaW1pdGl2ZXMgPSBjYWNoZUVudHJ5Lm9wdGlvbnMuZXZlcnkoKGs6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB2YWwgPSBjYWNoZUVudHJ5LmRhdGFba107XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbFR5cGUgPSB0eXBlb2YgdmFsO1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsVHlwZSA9PT0gJ251bWJlcicgfHwgdmFsVHlwZSA9PT0gJ3N0cmluZycgfHwgdmFsVHlwZSA9PT0gJ2Jvb2xlYW4nIHx8IHZhbCA9PT0gbnVsbDtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmVuZGVyRHJvcGRvd24obGV2ZWwgKyAxLCBjYWNoZUVudHJ5Lm9wdGlvbnMpO1xyXG5cclxuICAgICAgICBpZiAoaGFzT25seVByaW1pdGl2ZXMpIHtcclxuICAgICAgICAgICAgcmVuZGVyVmFsdWVzKGNhY2hlRW50cnkuZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY3VycmVudCA9IF9wYW5lbC5lZGl0ZWREYXRhO1xyXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBfcGFuZWwuc2VsZWN0ZWRQYXRoKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W2tdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZW5kZXJWYWx1ZXMoeyBba2V5XTogY3VycmVudCB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQnJlYWRjcnVtYigpIHtcclxuICAgIGlmIChfcGFuZWwuc2VsZWN0ZWRQYXRoLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5icmVhZGNydW1iUHJvcC5oaWRkZW4gPSBmYWxzZTtcclxuICAgICAgICAoX3BhbmVsIGFzIGFueSkuJC5icmVhZGNydW1iLnRleHRDb250ZW50ID0gX3BhbmVsLnNlbGVjdGVkUGF0aC5qb2luKCcgLyAnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgKF9wYW5lbCBhcyBhbnkpLiQuYnJlYWRjcnVtYlByb3AuaGlkZGVuID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyVmFsdWVzKG9iajogYW55KSB7XHJcbiAgICAoX3BhbmVsIGFzIGFueSkuJC52YWx1ZXNDb250YWluZXIuaW5uZXJIVE1MID0gJyc7XHJcblxyXG4gICAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcclxuICAgICAgICBjb25zdCBwcm9wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktcHJvcCcpO1xyXG5cclxuICAgICAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VpLWxhYmVsJyk7XHJcbiAgICAgICAgbGFiZWwuc2xvdCA9ICdsYWJlbCc7XHJcbiAgICAgICAgbGFiZWwudGV4dENvbnRlbnQgPSBrZXk7XHJcblxyXG4gICAgICAgIGxldCBpbnB1dDogYW55O1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktbnVtLWlucHV0Jyk7XHJcbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgICAgIC8vIEVkaXRhYmxlIC0gdHJhY2sgY2hhbmdlc1xyXG4gICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvblZhbHVlQ2hhbmdlKGtleSwgcGFyc2VGbG9hdChlLnRhcmdldC52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgIGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktY2hlY2tib3gnKTtcclxuICAgICAgICAgICAgaW5wdXQuY2hlY2tlZCA9IHZhbHVlO1xyXG4gICAgICAgICAgICAvLyBFZGl0YWJsZSAtIHRyYWNrIGNoYW5nZXNcclxuICAgICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGU6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgb25WYWx1ZUNoYW5nZShrZXksIGUudGFyZ2V0LmNoZWNrZWQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VpLWlucHV0Jyk7XHJcbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gdmFsdWUgIT09IG51bGwgPyBTdHJpbmcodmFsdWUpIDogJyc7XHJcbiAgICAgICAgICAgIC8vIEVkaXRhYmxlIC0gdHJhY2sgY2hhbmdlc1xyXG4gICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvblZhbHVlQ2hhbmdlKGtleSwgZS50YXJnZXQudmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlucHV0LnNsb3QgPSAnY29udGVudCc7XHJcblxyXG4gICAgICAgIHByb3AuYXBwZW5kQ2hpbGQobGFiZWwpO1xyXG4gICAgICAgIHByb3AuYXBwZW5kQ2hpbGQoaW5wdXQpO1xyXG4gICAgICAgIChfcGFuZWwgYXMgYW55KS4kLnZhbHVlc0NvbnRhaW5lci5hcHBlbmRDaGlsZChwcm9wKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIHZhbHVlIGNoYW5nZSAtIHVwZGF0ZSBlZGl0ZWREYXRhIOG7nyBkZWVwIG5lc3RlZCBwYXRoXHJcbiAqL1xyXG5mdW5jdGlvbiBvblZhbHVlQ2hhbmdlKGtleTogc3RyaW5nLCBuZXdWYWx1ZTogYW55KSB7XHJcbiAgICAvLyBOYXZpZ2F0ZSB0byBjdXJyZW50IHBhdGggdHJvbmcgZWRpdGVkRGF0YVxyXG4gICAgbGV0IGN1cnJlbnQgPSBfcGFuZWwuZWRpdGVkRGF0YTtcclxuICAgIGZvciAoY29uc3QgcGF0aEtleSBvZiBfcGFuZWwuc2VsZWN0ZWRQYXRoKSB7XHJcbiAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGF0aEtleV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXBkYXRlIHZhbHVlXHJcbiAgICBjdXJyZW50W2tleV0gPSBuZXdWYWx1ZTtcclxuICAgIF9wYW5lbC5pc01vZGlmaWVkID0gdHJ1ZTtcclxufVxyXG4iXX0=