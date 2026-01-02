import { _decorator, Component, Node, resources, Vec3, Prefab, instantiate, SpriteFrame, SpriteRenderer, JsonAsset, CCInteger } from 'cc';
import { ConfigLoader } from 'db://assets/Core/Config/ConfigLoader';
import { GridManager } from './GridManager';
import { TileCullingModule } from './TileCullingModule';
import { ObjectPoolling } from '../../Core/ObjectPoolling';
import { PlayerController } from 'db://assets/Player/Script/Core/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('LoadMap')
export class LoadMap extends Component {
    @property({ type: String, tooltip: 'Tên map cần load từ config' })
    public mapName: string = "Map1";

    @property({ type: CCInteger, tooltip: 'Kích thước pool cho tiles (tự động adjust nếu nhỏ hơn totalTiles)' })
    public tilePoolSize: number = 50;

    @property({ type: Boolean, tooltip: 'Bật/tắt tile culling' })
    public enableCulling: boolean = true;

    @property({ type: CCInteger, tooltip: 'Số ô xung quanh player cần active (1=3x3, 2=5x5)' })
    public cullingRange: number = 1;

    private _tiles: Map<string, { node: Node, row: number, col: number }> = new Map();

    private _gridRows: number = 0;
    private _gridCols: number = 0;
    private _totalTiles: number = 0;
    private _tileSize: number = 0;

    private _mapTilesContainer: Node = null;
    private _gridManager: GridManager = null;
    private _cullingModule: TileCullingModule = null;
    private _tilePool: ObjectPoolling = null;

    public get tiles(): Map<string, { node: Node, row: number, col: number }> { return this._tiles; }
    public get gridRows(): number { return this._gridRows; }
    public get gridCols(): number { return this._gridCols; }
    public get tileSize(): number { return this._tileSize; }
    public get mapContainer(): Node { return this._mapTilesContainer; }
    public get gridManager(): GridManager { return this._gridManager; }

    onLoad() {
        // Tạo pool component
        const poolNode = new Node("TilePool");
        poolNode.parent = this.node;
        this._tilePool = poolNode.addComponent(ObjectPoolling);
    }

    start() {
        this._mapTilesContainer = new Node("MapTiles");
        this.node.addChild(this._mapTilesContainer);

        this._ensureConfigLoaded(() => {
            this.loadMap(this.mapName);
        });
    }

    update(dt: number) {
        if (!this._cullingModule || !this.enableCulling) {
            return;
        }

        const player = PlayerController._instance;
        if (!player) {
            return;
        }

        const playerPos = player.node.getWorldPosition();
        this._cullingModule.updateVisibility(playerPos);
    }

    /**
     * Đảm bảo config đã được load trước khi sử dụng
     */
    private _ensureConfigLoaded(callback: () => void): void {
        if (ConfigLoader.sharedConfigData && Object.keys(ConfigLoader.sharedConfigData).length > 0) {
            callback();
            return;
        }

        resources.load('database/configs/game_config', JsonAsset, (err, jsonAsset) => {
            if (err) {
                console.error('[LoadMap] Failed to load config:', err);
                return;
            }

            ConfigLoader.sharedConfigData = jsonAsset.json;
            callback();
        });
    }

    /**
     * Load map theo tên
     */
    public loadMap(mapName: string): void {
        console.log(`[LoadMap] Loading map: ${mapName}`);

        if (!ConfigLoader.sharedConfigData) {
            setTimeout(() => this.loadMap(mapName), 100);
            return;
        }

        const templateConfig = this._loadTemplateConfig();
        const mapConfig = this._loadMapConfig(mapName);
        if (!templateConfig || !mapConfig) return;

        this._gridRows = templateConfig.gridRows;
        this._gridCols = templateConfig.gridCols;
        this._totalTiles = templateConfig.totalTiles;

        console.log(`[LoadMap] Grid: ${this._gridCols}x${this._gridRows}, Total: ${this._totalTiles}`);

        this.clearMap();

        this._loadAllSprites(mapConfig.spritePath, (sortedSprites) => {
            this._tileSize = sortedSprites[0].originalSize.width;
            console.log(`[LoadMap] TileSize: ${this._tileSize}px`);

            // Khởi tạo GridManager sau khi có tileSize
            this._gridManager = new GridManager(this._gridRows, this._gridCols, this._tileSize);

            this._loadPrefab(templateConfig.prefab, (prefab) => {
                this._spawnTiles(sortedSprites, prefab);
                console.log('[LoadMap] Map loaded successfully!');
            });
        });
    }

    /**
     * Load Template config
     */
    private _loadTemplateConfig(): any {
        const configData = ConfigLoader.sharedConfigData;

        if (!configData?.Prefabs?.Map?.Template) {
            console.error('[LoadMap] Thiếu Template config!');
            return null;
        }
        return configData.Prefabs.Map.Template;
    }

    /**
     * Load Map config theo tên
     */
    private _loadMapConfig(mapName: string): any {
        const configData = ConfigLoader.sharedConfigData;
        if (!configData?.Prefabs?.Map?.[mapName]) {
            console.error(`[LoadMap] Không tìm thấy map: ${mapName}`);
            return null;
        }
        return configData.Prefabs.Map[mapName];
    }

    /**
     * Load tất cả sprites trong folder và sort theo tên
     */
    private _loadAllSprites(
        spritePath: string,
        callback: (sprites: SpriteFrame[]) => void
    ): void {
        resources.loadDir(spritePath, SpriteFrame, (err, spriteFrames) => {
            if (err) {
                console.error('[LoadMap] Lỗi load sprites:', err);
                return;
            }

            const sorted = spriteFrames.sort((a, b) => {
                const nameA = parseInt(a.name);
                const nameB = parseInt(b.name);
                return nameA - nameB;
            });

            callback(sorted);
        });
    }

    /**
     * Load prefab tile
     */
    private _loadPrefab(
        prefabPath: string,
        callback: (prefab: Prefab) => void
    ): void {
        resources.load(prefabPath, Prefab, (err, prefabAsset) => {
            if (err) {
                console.error('[LoadMap] Lỗi load prefab:', err);
                return;
            }

            callback(prefabAsset);
        });
    }

    /**
     * Spawn tất cả tiles lên lưới (sử dụng Object Pooling)
     */
    private _spawnTiles(
        sortedSprites: SpriteFrame[],
        tilePrefab: Prefab
    ): void {
        // Init pool lần đầu
        if (!this._tilePool['_initialized']) {
            // Adjust pool size dựa trên totalTiles
            const poolSize = Math.max(this.tilePoolSize, this._totalTiles);
            this._tilePool.poolSize = poolSize;
            this._tilePool.init(tilePrefab);
            console.log(`[LoadMap] Initialized tile pool with size: ${poolSize}`);
        }

        sortedSprites.forEach((spriteFrame, index) => {
            const col = index % this._gridCols;
            const row = Math.floor(index / this._gridCols);

            // Lấy từ pool thay vì instantiate
            const tileNode = this._tilePool.getObject();
            tileNode.name = `Tile_${row}_${col}`;

            const renderer = tileNode.getComponent(SpriteRenderer);
            if (!renderer) {
                console.error('[LoadMap] Prefab thiếu SpriteRenderer!');
                return;
            }
            renderer.spriteFrame = spriteFrame;

            // Dùng GridManager để tính vị trí
            const pos = this._gridManager.getPosition(row, col);
            tileNode.setPosition(pos);

            // Add vào container
            tileNode.parent = this._mapTilesContainer;

            // Lưu vào Map theo row_col key
            const key = this._getTileKey(row, col);
            this._tiles.set(key, { node: tileNode, row, col });
        });

        // Khởi tạo culling module nếu enabled
        if (this.enableCulling) {
            this._cullingModule = new TileCullingModule(
                this._tiles,
                this._gridManager,
                this.cullingRange
            );
            console.log(`[LoadMap] Initialized culling module with range: ${this.cullingRange}`);
        }
    }

    /**
     * Helper method để generate tile key theo format row_col
     */
    private _getTileKey(row: number, col: number): string {
        return `${row}_${col}`;
    }

    /**
     * Clear toàn bộ map (return tiles về pool)
     */
    public clearMap(): void {
        console.log('[LoadMap] Clearing map...');

        this._tiles.forEach(tile => {
            tile.node.removeFromParent();
            // Return về pool thay vì destroy
            this._tilePool.returnObject(tile.node);
        });

        this._tiles.clear();
        this._cullingModule = null; // Reset culling module
    }

    /**
     * Debug: Show tất cả tiles
     */
    public showAllTiles(): void {
        if (this._cullingModule) {
            this._cullingModule.showAllTiles();
        } else {
            this._tiles.forEach(tile => tile.node.active = true);
        }
    }

    /**
     * Debug: Hide tất cả tiles
     */
    public hideAllTiles(): void {
        if (this._cullingModule) {
            this._cullingModule.hideAllTiles();
        } else {
            this._tiles.forEach(tile => tile.node.active = false);
        }
    }
}
