import { Vec3 } from 'cc';
export class GridManager {
    private _rows: number;
    private _cols: number;
    private _spacing: number;

    /**
     * Constructor
     * @param rows Số hàng trong grid
     * @param cols Số cột trong grid
     * @param spacing Khoảng cách giữa các ô (tileSize)
     */
    constructor(rows: number, cols: number, spacing: number) {
        this._rows = rows;
        this._cols = cols;
        this._spacing = spacing;
    }

    /**
     * Tính toán vị trí world position từ grid coordinates
     * @param row Hàng (0-indexed)
     * @param col Cột (0-indexed)
     * @returns Vec3 world position
     */
    public getPosition(row: number, col: number): Vec3 {
        const x = col * this._spacing / 2;
        const y = row * this._spacing / 2;
        return new Vec3(x, y, 0);
    }

    /**
     * Chuyển đổi world position sang grid coordinates
     * Hỗ trợ TileCullingManager xác định ô chứa player
     * @param worldPos Vị trí trong world space
     * @returns Object chứa row và col
     */
    public worldToGrid(worldPos: Vec3): { row: number, col: number } {
        const col = Math.floor(worldPos.x / (this._spacing / 2));
        const row = Math.floor(worldPos.y / (this._spacing / 2));
        return { row, col };
    }

    /**
     * Getter cho số hàng
     */
    public get rows(): number {
        return this._rows;
    }

    /**
     * Getter cho số cột
     */
    public get cols(): number {
        return this._cols;
    }

    /**
     * Getter cho khoảng cách giữa các ô
     */
    public get spacing(): number {
        return this._spacing;
    }
}
