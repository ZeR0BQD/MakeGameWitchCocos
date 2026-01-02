import { Node, Vec3 } from 'cc';
import { GridManager } from './GridManager';

export class TileCullingModule {
    private _tiles: Map<string, { node: Node, row: number, col: number }>;
    private _gridManager: GridManager;
    private _cullingRange: number;

    // Cache để tránh update không cần thiết
    private _lastPlayerGridRow: number = -1;
    private _lastPlayerGridCol: number = -1;

    /**
     * Constructor
     * @param tiles Map chứa tile data với key row_col
     * @param gridManager GridManager instance để convert positions
     * @param cullingRange Số ô xung quanh player cần active (1 = 3x3, 2 = 5x5)
     */
    constructor(
        tiles: Map<string, { node: Node, row: number, col: number }>,
        gridManager: GridManager,
        cullingRange: number
    ) {
        this._tiles = tiles;
        this._gridManager = gridManager;
        this._cullingRange = cullingRange;
    }

    /**
     * Cập nhật visibility của tiles dựa trên player position
     * @param playerWorldPos Vị trí player trong world space
     * @returns true nếu có update, false nếu skip (optimization)
     */
    public updateVisibility(playerWorldPos: Vec3): boolean {
        // Tính grid position của player
        const playerGridPos = this._gridManager.worldToGrid(playerWorldPos);

        // Optimization: chỉ update khi player chuyển sang ô mới
        if (playerGridPos.row === this._lastPlayerGridRow &&
            playerGridPos.col === this._lastPlayerGridCol) {
            return false;
        }

        this._lastPlayerGridRow = playerGridPos.row;
        this._lastPlayerGridCol = playerGridPos.col;

        // Tìm các tiles cần active
        const nodesToActivate = this._findTilesToActivate(playerGridPos);

        // Deactivate tiles xa player
        this._deactivateFarTiles(nodesToActivate);

        // Activate tiles gần player
        this._activateNearTiles(nodesToActivate);

        return true;
    }

    /**
     * Tìm các tiles cần được activate (trong vùng cullingRange)
     */
    private _findTilesToActivate(playerGridPos: { row: number, col: number }): Set<Node> {
        const nodesToActivate: Set<Node> = new Set();

        // Duyệt qua các ô xung quanh player
        for (let offsetRow = -this._cullingRange; offsetRow <= this._cullingRange; offsetRow++) {
            for (let offsetCol = -this._cullingRange; offsetCol <= this._cullingRange; offsetCol++) {
                const row = playerGridPos.row + offsetRow;
                const col = playerGridPos.col + offsetCol;

                // Kiểm tra trong bounds
                if (row >= 0 && row < this._gridManager.rows &&
                    col >= 0 && col < this._gridManager.cols) {
                    const key = `${row}_${col}`;
                    const tile = this._tiles.get(key);
                    if (tile) {
                        nodesToActivate.add(tile.node);
                    }
                }
            }
        }

        return nodesToActivate;
    }

    /**
     * Tắt các tiles xa player
     */
    private _deactivateFarTiles(nodesToActivate: Set<Node>): void {
        this._tiles.forEach(tile => {
            if (!nodesToActivate.has(tile.node) && tile.node.active) {
                tile.node.active = false;
            }
        });
    }

    /**
     * Bật các tiles gần player
     */
    private _activateNearTiles(nodesToActivate: Set<Node>): void {
        nodesToActivate.forEach(tile => {
            if (!tile.active) {
                tile.active = true;
            }
        });
    }

    /**
     * Force activate tất cả tiles (debug)
     */
    public showAllTiles(): void {
        this._tiles.forEach(tile => {
            tile.node.active = true;
        });
    }

    /**
     * Force deactivate tất cả tiles (debug)
     */
    public hideAllTiles(): void {
        this._tiles.forEach(tile => {
            tile.node.active = false;
        });
    }

    /**
     * Reset cache khi cần force update
     */
    public resetCache(): void {
        this._lastPlayerGridRow = -1;
        this._lastPlayerGridCol = -1;
    }
}
