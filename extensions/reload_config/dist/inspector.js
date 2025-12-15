'use strict';

const path = require('path');
const fs = require('fs');

exports.template = `
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

exports.$ = {
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

let _panel = null;

exports.ready = function () {
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
};

exports.update = function (dump) {
    this.dump = dump;
};

function onClear() {
    console.log('[Inspector] Clear button clicked');

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

    console.log('[Inspector] ✓ Cleared all state');
}

function onLoadConfig() {
    console.log('[Inspector] ========== LOAD CONFIG START ==========');

    // Read UUID directly from ui-asset
    var assetUUID = _panel.$.asset.value;
    console.log('[Inspector] Config asset UUID from ui-asset.value:', assetUUID);

    if (!assetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Please drag JSON file to Config Asset';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }

    var compUUID = _panel.dump && _panel.dump.value && _panel.dump.value.uuid;
    if (!compUUID) {
        console.error('[Inspector] Component UUID not found');
        return;
    }

    // 1. Call component.loadAndApplyConfig()
    Editor.Message.request('scene', 'execute-component-method', {
        uuid: compUUID,
        name: 'loadAndApplyConfig',
        args: []
    }).then(function () {
        console.log('[Inspector] ✓ Component loadAndApplyConfig() called');

        // 2. Query asset info
        return Editor.Message.request('asset-db', 'query-asset-info', assetUUID);
    }).then(function (assetInfo) {
        if (!assetInfo || !assetInfo.source) {
            throw new Error('Asset not found');
        }

        var filePath = assetInfo.source;
        console.log('[Inspector] Asset source path:', filePath);

        // Convert db:// path
        if (filePath.startsWith('db:/')) {
            var relativePath = filePath.substring(4).replace(/\//g, path.sep);
            filePath = path.join(Editor.Project.path, relativePath);
        }

        // 3. Read JSON file
        var jsonContent = fs.readFileSync(filePath, 'utf-8');
        var configData = JSON.parse(jsonContent);

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

        console.log('[Inspector] ========== LOAD CONFIG COMPLETE ==========');

    }).catch(function (err) {
        console.error('[Inspector] Load error:', err);
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Load Failed ✗';
        _panel.$.statusText.style.color = '#F44336';
    });
}

async function onUpdateConfig() {
    console.log('[Inspector] ========== UPDATE & SAVE START ==========');

    // Read UUID from ui-asset
    var configAssetUUID = _panel.$.asset.value;
    var updateAssetUUID = _panel.$.updateAsset.value;

    console.log('[Inspector] Config asset UUID:', configAssetUUID);
    console.log('[Inspector] Update asset UUID:', updateAssetUUID);

    if (!configAssetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Config Asset required';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }

    if (!updateAssetUUID) {
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Error: Update Config Asset required';
        _panel.$.statusText.style.color = '#F44336';
        return;
    }

    try {
        // 1. Get file paths
        var configAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', configAssetUUID);
        var updateAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', updateAssetUUID);

        var configFilePath = configAssetInfo.source;
        var updateFilePath = updateAssetInfo.source;

        // Convert db:// paths
        if (configFilePath.startsWith('db:/')) {
            var relativePath = configFilePath.substring(4).replace(/\//g, path.sep);
            configFilePath = path.join(Editor.Project.path, relativePath);
        }
        if (updateFilePath.startsWith('db:/')) {
            var relativePath = updateFilePath.substring(4).replace(/\//g, path.sep);
            updateFilePath = path.join(Editor.Project.path, relativePath);
        }

        console.log('[Inspector] Config file path:', configFilePath);
        console.log('[Inspector] Update file path:', updateFilePath);

        // 2. Read both JSON files
        var configData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        var updateData = JSON.parse(fs.readFileSync(updateFilePath, 'utf-8'));

        console.log('[Inspector] === BEFORE MERGE ===');
        console.log('[Inspector] Config:', JSON.stringify(configData, null, 2));
        console.log('[Inspector] Update:', JSON.stringify(updateData, null, 2));

        // 3. Deep merge
        deepMerge(configData, updateData);

        console.log('[Inspector] === AFTER MERGE ===');
        console.log('[Inspector] Merged config:', JSON.stringify(configData, null, 2));

        // 4. Save to file
        var jsonString = JSON.stringify(configData, null, 4);
        fs.writeFileSync(configFilePath, jsonString, 'utf-8');

        console.log('[Inspector] ✓✓✓ SAVED to file:', configFilePath);

        // 5. Refresh asset database
        await Editor.Message.request('asset-db', 'refresh-asset', configAssetUUID);

        // 6. Update UI
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Updated & Saved ✓';
        _panel.$.statusText.style.color = '#FF9800';

        // 7. Reload config to show changes
        setTimeout(function () {
            onLoadConfig();
        }, 500);

        console.log('[Inspector] ========== UPDATE & SAVE COMPLETE ==========');

    } catch (err) {
        console.error('[Inspector] Update failed:', err);
        _panel.$.statusProp.hidden = false;
        _panel.$.statusText.textContent = 'Update Failed ✗';
        _panel.$.statusText.style.color = '#F44336';
    }
}

function deepMerge(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}

function buildLevelsCache(data, pathPrefix) {
    pathPrefix = pathPrefix || [];
    var pathKey = pathPrefix.join('.');

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        var keys = Object.keys(data);

        _panel.levelsCache[pathKey] = {
            options: keys,
            path: pathPrefix,
            data: data
        };

        keys.forEach(function (key) {
            var newPath = pathPrefix.concat([key]);
            buildLevelsCache(data[key], newPath);
        });
    }
}

function renderLevel1() {
    var cacheEntry = _panel.levelsCache[''];
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

    var prop = document.createElement('ui-prop');
    var label = document.createElement('ui-label');
    label.slot = 'label';
    label.textContent = 'Level ' + (level + 1);

    var select = document.createElement('ui-select');
    select.slot = 'content';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select --';
    select.appendChild(placeholder);

    options.forEach(function (opt) {
        var option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });

    select.addEventListener('change', function (e) {
        var selectedKey = e.target.value;
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

    var pathKey = _panel.selectedPath.join('.');
    var cacheEntry = _panel.levelsCache[pathKey];

    if (cacheEntry && cacheEntry.options) {
        var hasOnlyPrimitives = cacheEntry.options.every(function (k) {
            var val = cacheEntry.data[k];
            var valType = typeof val;
            return valType === 'number' || valType === 'string' || valType === 'boolean' || val === null;
        });

        renderDropdown(level + 1, cacheEntry.options);

        if (hasOnlyPrimitives) {
            renderValues(cacheEntry.data);
        }
    } else {
        var current = _panel.editedData;
        for (var i = 0; i < _panel.selectedPath.length; i++) {
            current = current[_panel.selectedPath[i]];
        }
        var obj = {};
        obj[key] = current;
        renderValues(obj);
    }
}

function updateBreadcrumb() {
    if (_panel.selectedPath.length > 0) {
        _panel.$.breadcrumbProp.hidden = false;
        _panel.$.breadcrumb.textContent = _panel.selectedPath.join(' / ');
    } else {
        _panel.$.breadcrumbProp.hidden = true;
    }
}

function renderValues(obj) {
    _panel.$.valuesContainer.innerHTML = '';

    Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        var prop = document.createElement('ui-prop');

        var label = document.createElement('ui-label');
        label.slot = 'label';
        label.textContent = key;

        var input;
        if (typeof value === 'number') {
            input = document.createElement('ui-num-input');
            input.value = value;
            input.setAttribute('readonly', 'true');
        } else if (typeof value === 'boolean') {
            input = document.createElement('ui-checkbox');
            input.checked = value;
            input.setAttribute('disabled', 'true');
        } else {
            input = document.createElement('ui-input');
            input.value = value !== null ? String(value) : '';
            input.setAttribute('readonly', 'true');
        }

        input.slot = 'content';

        prop.appendChild(label);
        prop.appendChild(input);
        _panel.$.valuesContainer.appendChild(prop);
    });
}
