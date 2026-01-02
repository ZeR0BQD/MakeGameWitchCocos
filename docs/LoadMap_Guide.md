# LoadMap System - Hướng Dẫn Sử Dụng

## Tổng Quan Hệ Thống

LoadMap là hệ thống quản lý tile-based map với **Module Pattern** và **Object Pooling**, tối ưu cho việc load/switch maps động.

**Kiến trúc:**
- `LoadMap`: Component điều phối chính
- `GridManager`: Module tính toán grid positions
- `TileCullingModule`: Module quản lý tile visibility
- `ObjectPoolling`: Component quản lý tile reuse

**Ưu điểm:**
- ✅ Performance: Zero GC nhờ pooling, O(1) tile lookup
- ✅ Modularity: Logic tách biệt, dễ test
- ✅ Scalability: Dễ dàng switch maps, thêm features
- ✅ Optimization: Tile culling giảm draw calls

---

## Cách Hoạt Động

### Flow Diagram

```
LoadMap.start()
    ↓
Load Config (gridRows, gridCols, prefab, sprites)
    ↓
Init GridManager (tileSize)
    ↓
Init ObjectPoolling (tilePrefab)
    ↓
Spawn Tiles (getObject từ pool)
    ↓
Init TileCullingModule (tiles, gridManager, range)
    ↓
LoadMap.update() → CullingModule.updateVisibility()
    ↓
Activate/Deactivate tiles based on player position
```

### Lifecycle

1. **onLoad**: Tạo ObjectPoolling component
2. **start**: Load config và call loadMap()
3. **loadMap**: Load sprites → GridManager → spawn tiles
4. **update**: Update culling dựa trên player position
5. **clearMap**: Return tiles về pool (không destroy)

---

## Setup Cơ Bản

### Bước 1: Tạo Map Config

File: `assets/resources/database/configs/game_config.json`

```json
{
  "Prefabs": {
    "Map": {
      "Template": {
        "prefab": "database/Map/Template/MapTilePrefab",
        "totalTiles": 24,
        "gridRows": 4,
        "gridCols": 6
      },
      "Map1": {
        "spritePath": "database/Map/Map1/Sprite"
      },
      "Map2": {
        "spritePath": "database/Map/Map2/Sprite"
      }
    }
  }
}
```

**Cấu trúc folder sprites:**
```
resources/
└── database/
    └── Map/
        ├── Template/
        │   └── MapTilePrefab.prefab  // Prefab có SpriteRenderer
        └── Map1/
            └── Sprite/
                ├── 1.png
                ├── 2.png
                ├── 3.png
                └── ...24.png
```

### Bước 2: Setup LoadMap Component

1. Tạo Node "LoadMap" trong scene
2. Add Component → LoadMap
3. Config properties trong Inspector:

```typescript
mapName: "Map1"           // Map cần load
tilePoolSize: 50          // Pool size (auto adjust nếu < totalTiles)
enableCulling: true       // Bật/tắt culling
cullingRange: 1           // 1 = 3x3, 2 = 5x5
```

### Bước 3: Done!

LoadMap sẽ tự động:
- Tạo pool cho tiles
- Load và spawn tiles theo grid
- Setup culling nếu enable

---

## API Reference

### LoadMap Component

#### Public Properties

```typescript
@property({ type: String })
public mapName: string = "Map1";
// Tên map trong config cần load

@property({ type: CCInteger })
public tilePoolSize: number = 50;
// Kích thước pool ban đầu

@property({ type: Boolean })
public enableCulling: boolean = true;
// Bật/tắt tile culling optimization

@property({ type: CCInteger })
public cullingRange: number = 1;
// Số ô xung quanh player active (1=3x3, 2=5x5)
```

#### Public Methods

```typescript
public loadMap(mapName: string): void
```
Load map mới theo tên. Tiles cũ được return về pool.

**Example:**
```typescript
const loadMap = this.getComponent(LoadMap);
loadMap.loadMap("Map2");
```

---

```typescript
public clearMap(): void
```
Clear toàn bộ map hiện tại, return tiles về pool.

**Example:**
```typescript
loadMap.clearMap();
```

---

```typescript
public showAllTiles(): void
public hideAllTiles(): void
```
Debug methods để show/hide tất cả tiles.

**Example:**
```typescript
loadMap.showAllTiles();  // Debug: hiện tất cả tiles
```

#### Public Getters

```typescript
public get tiles(): Map<string, { node: Node, row: number, col: number }>
```
Lấy Map chứa tile data với key `"row_col"`.

---

```typescript
public get gridManager(): GridManager
```
Lấy GridManager instance để tính toán positions.

---

### GridManager Module

```typescript
constructor(rows: number, cols: number, spacing: number)
```
Tạo GridManager với grid info.

---

```typescript
public getPosition(row: number, col: number): Vec3
```
Tính world position từ grid coordinates.

**Example:**
```typescript
const pos = gridManager.getPosition(2, 3);
// Returns Vec3 position của tile ở row 2, col 3
```

---

```typescript
public worldToGrid(worldPos: Vec3): { row: number, col: number }
```
Convert world position sang grid coordinates.

**Example:**
```typescript
const gridPos = gridManager.worldToGrid(player.position);
console.log(`Player ở ô (${gridPos.row}, ${gridPos.col})`);
```

---

### TileCullingModule

```typescript
constructor(
    tiles: Map<string, TileData>,
    gridManager: GridManager,
    cullingRange: number
)
```
Tạo culling module (tự động được gọi bởi LoadMap).

---

```typescript
public updateVisibility(playerWorldPos: Vec3): boolean
```
Update tile visibility dựa trên player position.
Returns `true` nếu có update, `false` nếu skip (cache optimization).

---

## Examples

### Example 1: Load Map Dynamically

```typescript
import { _decorator, Component } from 'cc';
import { LoadMap } from '../Core/LoadMap/LoadMap';

const { ccclass, property } = _decorator;

@ccclass('LevelLoader')
export class LevelLoader extends Component {
    @property({ type: LoadMap })
    private loadMap: LoadMap = null;

    public loadLevel(levelNumber: number): void {
        const mapName = `Map${levelNumber}`;
        this.loadMap.loadMap(mapName);
    }
}
```

---

### Example 2: Switch Between Maps

```typescript
import { _decorator, Component } from 'cc';
import { LoadMap } from '../Core/LoadMap/LoadMap';

const { ccclass, property } = _decorator;

@ccclass('MapSwitcher')
export class MapSwitcher extends Component {
    @property({ type: LoadMap })
    private loadMap: LoadMap = null;

    private _currentMapIndex: number = 1;
    private _totalMaps: number = 3;

    public nextMap(): void {
        this._currentMapIndex++;
        if (this._currentMapIndex > this._totalMaps) {
            this._currentMapIndex = 1;
        }
        
        this.loadMap.loadMap(`Map${this._currentMapIndex}`);
    }

    public previousMap(): void {
        this._currentMapIndex--;
        if (this._currentMapIndex < 1) {
            this._currentMapIndex = this._totalMaps;
        }
        
        this.loadMap.loadMap(`Map${this._currentMapIndex}`);
    }
}
```

---

### Example 3: Get Tile Info

```typescript
import { _decorator, Component, Vec3 } from 'cc';
import { LoadMap } from '../Core/LoadMap/LoadMap';

const { ccclass, property } = _decorator;

@ccclass('TileInspector')
export class TileInspector extends Component {
    @property({ type: LoadMap })
    private loadMap: LoadMap = null;

    public getTileAtPosition(worldPos: Vec3): Node | null {
        const gridManager = this.loadMap.gridManager;
        if (!gridManager) return null;

        // Convert world → grid
        const gridPos = gridManager.worldToGrid(worldPos);
        
        // Get tile từ Map
        const key = `${gridPos.row}_${gridPos.col}`;
        const tileData = this.loadMap.tiles.get(key);
        
        return tileData ? tileData.node : null;
    }

    public printAllTiles(): void {
        this.loadMap.tiles.forEach((tile, key) => {
            console.log(`Tile ${key}: row=${tile.row}, col=${tile.col}`);
        });
    }
}
```

---

## Thêm Map Mới

### Bước 1: Chuẩn Bị Assets

1. Tạo folder mới: `resources/database/Map/MapX/Sprite/`
2. Thêm sprites đánh số từ 1.png đến N.png (N = totalTiles)
3. Import vào Cocos Creator

### Bước 2: Thêm Config

File: `game_config.json`

```json
{
  "Prefabs": {
    "Map": {
      "Template": { ... },
      "MapX": {
        "spritePath": "database/Map/MapX/Sprite"
      }
    }
  }
}
```

### Bước 3: Load Map

```typescript
loadMap.loadMap("MapX");
```

> [!NOTE]
> Sprites phải đánh số tuần tự từ 1. Thứ tự sprites = thứ tự spawn (left-to-right, top-to-bottom).

---

## Best Practices

### 1. Pool Size Configuration

**Quy tắc:**
- Set `tilePoolSize >= totalTiles` để tránh tạo thêm objects
- Nếu có nhiều maps cùng grid size, set pool = max(allTotalTiles)

**Example:**
```typescript
// Map1: 24 tiles, Map2: 30 tiles, Map3: 24 tiles
tilePoolSize: 30  // Đủ cho tất cả maps
```

### 2. Culling Range

**Suggestion:**
- Small maps (< 50 tiles): `cullingRange = 0` (tắt culling)
- Medium maps (50-200 tiles): `cullingRange = 1` (3x3)
- Large maps (> 200 tiles): `cullingRange = 2` (5x5)

### 3. Performance Tips

**Cache references nếu cần access thường xuyên:**
```typescript
private _gridManager: GridManager = null;

start() {
    const loadMap = this.getComponent(LoadMap);
    this._gridManager = loadMap.gridManager;
}
```

**Tránh loadMap() trong update():**
```typescript
// ❌ Bad
update() {
    if (condition) {
        this.loadMap("Map2");  // Lag!
    }
}

// ✅ Good
private _shouldSwitch: boolean = false;

update() {
    if (condition) {
        this._shouldSwitch = true;
    }
}

lateUpdate() {
    if (this._shouldSwitch) {
        this._shouldSwitch = false;
        this.loadMap("Map2");
    }
}
```

### 4. Memory Management

Object pooling tự động quản lý memory:

```typescript
// Khi switch map
loadMap.loadMap("Map2");
// → Map1 tiles return về pool
// → Map2 reuse tiles từ pool
// → Zero GC!
```

---

## Troubleshooting

### Map không load

**Kiểm tra:**
1. ✅ Config path đúng chưa? (`Prefabs.Map.MapName`)
2. ✅ Sprites có trong `resources/` folder chưa?
3. ✅ Sprite names có đúng format số (1, 2, 3...) không?
4. ✅ totalTiles trong Template có match số sprites không?

**Debug:**
```typescript
// Thêm log vào loadMap()
console.log('[LoadMap] Loading map:', mapName);
```

---

### Tiles bị offset/sai vị trí

**Nguyên nhân:** GridManager tính position dựa trên tileSize

**Kiểm tra:**
1. ✅ Tất cả sprites có cùng size không?
2. ✅ Sprite pivot ở center chưa?
3. ✅ Grid formula đúng chưa? (x = col * tileSize / 2)

**Fix:**
```typescript
// Trong GridManager, có thể adjust formula nếu cần
public getPosition(row: number, col: number): Vec3 {
    const x = col * this._spacing; // Thử bỏ /2 nếu cần full spacing
    const y = row * this._spacing;
    return new Vec3(x, y, 0);
}
```

---

### Culling không hoạt động

**Kiểm tra:**
1. ✅ `enableCulling = true` chưa?
2. ✅ `PlayerController._instance` có khả dụng không?
3. ✅ Player có di chuyển không? (culling chỉ update khi chuyển ô)

**Debug:**
```typescript
// Thêm log vào TileCullingModule
public updateVisibility(playerWorldPos: Vec3): boolean {
    console.log('Player world pos:', playerWorldPos);
    const gridPos = this._gridManager.worldToGrid(playerWorldPos);
    console.log('Player grid pos:', gridPos.row, gridPos.col);
    // ...
}
```

---

### Pool hết objects

**Warning:** `[ObjectPoolling] Pool "TilePool" hết! Tạo thêm object mới.`

**Fix:**
```typescript
// Tăng tilePoolSize
tilePoolSize: 100  // Thay vì 50
```

Hoặc config dynamic:
```typescript
// LoadMap tự động adjust pool size
// poolSize = Math.max(tilePoolSize, totalTiles)
// → Luôn đủ tiles
```

---

## Advanced Usage

### Custom Grid Formula

Nếu muốn custom cách tính position:

File: `GridManager.ts`

```typescript
public getPosition(row: number, col: number): Vec3 {
    // Hexagonal grid example
    const x = col * this._spacing + (row % 2) * (this._spacing / 2);
    const y = row * this._spacing * 0.866; // √3/2
    return new Vec3(x, y, 0);
}
```

### Dynamic Culling Range

Adjust culling range runtime:

```typescript
import { LoadMap } from '../Core/LoadMap/LoadMap';

// Trong script khác
const loadMap = this.getComponent(LoadMap);
loadMap.cullingRange = 2;  // Tăng range lên 5x5

// Force update culling
if (loadMap['_cullingModule']) {
    loadMap['_cullingModule'].resetCache();
}
```

### Multi-Layer Maps

Tạo nhiều LoadMap components cho layers khác nhau:

```
Scene
├── Background
│   └── LoadMap (mapName: "BG_Map1")
├── Ground
│   └── LoadMap (mapName: "Ground_Map1")
└── Foreground
    └── LoadMap (mapName: "FG_Map1")
```

---

## Checklist Khi Thêm Map Mới

- [ ] Tạo folder sprites trong `resources/database/Map/MapX/Sprite/`
- [ ] Sprites đã đánh số tuần tự từ 1 đến N
- [ ] Thêm config vào `game_config.json`
- [ ] Verify `spritePath` đúng trong config
- [ ] Test load map bằng `loadMap.loadMap("MapX")`
- [ ] Kiểm tra tiles position đúng không
- [ ] Test culling hoạt động (nếu enable)
- [ ] Verify pool size đủ lớn

---

## Files Liên Quan

| File | Path | Mô tả |
|------|------|-------|
| LoadMap | `assets/Core/LoadMap/LoadMap.ts` | Main coordinator component |
| GridManager | `assets/Core/LoadMap/GridManager.ts` | Grid position calculations |
| TileCullingModule | `assets/Core/LoadMap/TileCullingModule.ts` | Tile visibility logic |
| ObjectPoolling | `assets/Core/ObjectPoolling.ts` | Generic pooling system |
| Config | `assets/resources/database/configs/game_config.json` | Map configurations |

---

**Tài liệu được tạo:** 2026-01-02  
**Version:** 2.0  
**System:** LoadMap với Module Pattern & Object Pooling
