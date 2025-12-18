# UI Manager System - Hướng Dẫn Sử Dụng

## Tổng Quan Hệ Thống

UI Manager là hệ thống **Pub-Sub (Publisher-Subscriber)** pattern giúp quản lý giao tiếp giữa game logic và UI components.

**Kiến trúc:**
- `UIManager`: Singleton quản lý events và subscribers
- `IUISubscriber`: Interface cho components muốn nhận events
- UI Controllers (EXPController, TimerController...): Implement IUISubscriber để nhận updates

**Ưu điểm:**
- ✅ Decoupling: Game logic không cần biết UI components
- ✅ Scalability: Dễ thêm UI components mới
- ✅ Maintainability: Code sạch, dễ maintain
- ✅ Performance: Chỉ update UI khi cần thiết

---

## Cách Hoạt Động

### Flow Diagram

```
PlayerController (hoặc bất kỳ logic nào)
    ↓
    publish('EXP_CHANGED', {data})
    ↓
UIManager
    ↓
    Notify tất cả subscribers của 'EXP_CHANGED'
    ↓
EXPController.onUIEvent('EXP_CHANGED', {data})
    ↓
    Update ProgressBar
```

### Lifecycle

1. **Khởi tạo**: UIManager được tạo singleton trong scene
2. **Subscribe**: UI components subscribe vào events trong `start()`
3. **Publish**: Game logic publish events khi có thay đổi
4. **Receive**: UI components nhận events qua `onUIEvent()`
5. **Cleanup**: UI components unsubscribe trong `onDestroy()`

---

## Tạo UI Component Mới

### Bước 1: Implement IUISubscriber

File: `assets/UI/Script/MyUIController.ts`

```typescript
import { _decorator, Component, Label } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('MyUIController')
export class MyUIController extends Component implements IUISubscriber {
    @property({ type: Label, tooltip: 'Label hiển thị' })
    private myLabel: Label = null;

    start() {
        const uiManager = UIManager.getInstance();

        if (uiManager) {
            uiManager.subscribe(this, 'MY_EVENT');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'MY_EVENT');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'MY_EVENT') {
            this._updateUI(data);
        }
    }

    private _updateUI(data: any): void {
        if (this.myLabel) {
            this.myLabel.string = data.message;
        }
    }
}
```

### Bước 2: Publish Event Từ Game Logic

File: `PlayerController.ts` (hoặc bất kỳ script nào)

```typescript
import { UIManager } from '../../UI/Script/UIManager';

// Ở đâu đó trong code khi cần update UI
private _notifyUI(): void {
    const uiManager = UIManager.getInstance();
    if (uiManager) {
        uiManager.publish('MY_EVENT', {
            message: 'Hello UI!'
        });
    }
}
```

### Bước 3: Setup Trong Cocos Creator Editor

1. Tạo Node mới trong scene hierarchy
2. Add Component → Custom → MyUIController
3. Kéo thả Label reference vào property
4. Đảm bảo UIManager có trong scene (thường attach vào Canvas)

---

## Examples

### Example 1: EXP Bar (Có Sẵn)

**File**: [`EXPController.ts`](file:///d:/Cocos/MakeGameWitchCocos/assets/UI/Script/EXPController.ts)

**Event Type**: `EXP_CHANGED`

**Full Implementation**:

```typescript
import { _decorator, Component, ProgressBar } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('EXPController')
export class EXPController extends Component implements IUISubscriber {
    @property({ type: ProgressBar, tooltip: 'EXP Progress Bar' })
    private expBar: ProgressBar = null;

    private _lastLevel: number = 1;

    start() {
        const uiManager = UIManager.getInstance();

        if (uiManager) {
            uiManager.subscribe(this, 'EXP_CHANGED');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'EXP_CHANGED');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'EXP_CHANGED') {
            this._updateEXP(data);
        }
    }

    private _updateEXP(data: any): void {
        if (this.expBar) {
            this.expBar.progress = data.percent;
        }

        if (data.level > this._lastLevel) {
            this._lastLevel = data.level;
        }
    }
}
```

**Publisher Example** (trong PlayerController hoặc script khác):

```typescript
import { UIManager } from '../../UI/Script/UIManager';

private _publishEXPChanged(): void {
    const uiManager = UIManager.getInstance();
    if (uiManager) {
        uiManager.publish('EXP_CHANGED', {
            percent: this._currentEXP / this._maxEXP,
            level: this._level
        });
    }
}
```

---

### Example 2: Timer Display

**File**: [`TimerController.ts`](file:///d:/Cocos/MakeGameWitchCocos/assets/UI/Script/TimerController.ts)

**Event Type**: `TIME_UPDATED`

**Full Implementation**:

```typescript
import { _decorator, Component, Label } from 'cc';
import { IUISubscriber } from './IUISubscriber';
import { UIManager } from './UIManager';

const { ccclass, property } = _decorator;

@ccclass('TimerController')
export class TimerController extends Component implements IUISubscriber {
    @property({ type: Label, tooltip: 'Label hiển thị thời gian' })
    private timeLabel: Label = null;

    start() {
        const uiManager = UIManager.getInstance();

        if (uiManager) {
            uiManager.subscribe(this, 'TIME_UPDATED');
        }
    }

    onDestroy() {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.unsubscribe(this, 'TIME_UPDATED');
        }
    }

    public onUIEvent(eventType: string, data: any): void {
        if (eventType === 'TIME_UPDATED') {
            this._updateTime(data);
        }
    }

    private _updateTime(data: any): void {
        // Validate data
        if (!data || typeof data.time !== 'number') {
            console.warn('TimerController: Invalid data received for TIME_UPDATED');
            return;
        }

        if (this.timeLabel) {
            // Format time MM:SS
            const minutes = Math.floor(data.time / 60);
            const seconds = Math.floor(data.time % 60);
            this.timeLabel.string = `${this._padZero(minutes)}:${this._padZero(seconds)}`;
        }
    }

    private _padZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }
}
```

**Publisher Example** (trong GameManager hoặc TimerSystem):

```typescript
import { UIManager } from '../../UI/Script/UIManager';

// Trong update() hoặc countdown logic
private _currentTime: number = 300; // 5 phút

update(dt: number) {
    this._currentTime -= dt;
    
    const uiManager = UIManager.getInstance();
    if (uiManager) {
        uiManager.publish('TIME_UPDATED', {
            time: this._currentTime  // TimerController sẽ tự format
        });
    }
}
```

> [!NOTE]
> `TimerController` tự động format thời gian thành MM:SS, publisher chỉ cần gửi số giây.

---

### Example 3: Multiple Events Per Component

Một component có thể subscribe nhiều events:

```typescript
start() {
    const uiManager = UIManager.getInstance();

    if (uiManager) {
        uiManager.subscribe(this, 'HEALTH_CHANGED');
        uiManager.subscribe(this, 'SHIELD_CHANGED');
        uiManager.subscribe(this, 'ARMOR_CHANGED');
    }
}

public onUIEvent(eventType: string, data: any): void {
    switch (eventType) {
        case 'HEALTH_CHANGED':
            this._updateHealth(data);
            break;
        case 'SHIELD_CHANGED':
            this._updateShield(data);
            break;
        case 'ARMOR_CHANGED':
            this._updateArmor(data);
            break;
    }
}
```

---

## Best Practices

### 1. Event Naming Convention

**Quy tắc:**
- Sử dụng UPPER_SNAKE_CASE
- Mô tả rõ ràng action (VD: `HEALTH_CHANGED`, không phải `HEALTH`)
- Thêm suffix `_CHANGED`, `_UPDATED`, `_TRIGGERED` tùy ngữ cảnh

**Examples:**
```typescript
'EXP_CHANGED'        // ✅ Good
'TIME_UPDATED'       // ✅ Good
'LEVEL_UP_TRIGGERED' // ✅ Good
'health'             // ❌ Bad - lowercase
'HP'                 // ❌ Bad - không rõ action
```

### 2. Data Structure

**Luôn truyền object**, không truyền primitive values:

```typescript
// ✅ Good
uiManager.publish('SCORE_CHANGED', {
    score: 1000,
    combo: 5,
    rank: 'S'
});

// ❌ Bad
uiManager.publish('SCORE_CHANGED', 1000);
```

### 3. Performance Optimization

**Cache UIManager instance** nếu publish thường xuyên:

```typescript
private _uiManager: UIManager = null;

start() {
    this._uiManager = UIManager.getInstance();
}

private _notifyUI(): void {
    if (this._uiManager) {
        this._uiManager.publish('EVENT', {data});
    }
}
```

### 4. Error Handling

UIManager đã có try-catch built-in, nhưng nên validate data:

```typescript
public onUIEvent(eventType: string, data: any): void {
    if (eventType === 'MY_EVENT') {
        // Validate data trước khi dùng
        if (!data || !data.value) {
            console.warn('Invalid data received for MY_EVENT');
            return;
        }
        this._updateUI(data);
    }
}
```

### 5. Cleanup

**Luôn unsubscribe** trong `onDestroy()`:

```typescript
onDestroy() {
    const uiManager = UIManager.getInstance();
    if (uiManager) {
        uiManager.unsubscribe(this, 'MY_EVENT');
    }
}
```

---

## Common Event Types

Đây là các event types được suggest cho game:

| Event Type | Publisher | Data Structure | Usage |
|-----------|-----------|----------------|-------|
| `EXP_CHANGED` | PlayerController | `{percent: number, level: number}` | Update EXP bar |
| `TIME_UPDATED` | GameManager | `{time: number, formatted: string}` | Update timer |
| `HEALTH_CHANGED` | PlayerController | `{current: number, max: number}` | Update health bar |
| `SCORE_CHANGED` | GameManager | `{score: number}` | Update score display |
| `LEVEL_UP` | PlayerController | `{newLevel: number}` | Show level up effect |
| `CURRENCY_CHANGED` | InventoryManager | `{gold: number, gems: number}` | Update currency UI |
| `SKILL_COOLDOWN` | SkillSystem | `{skillId: string, remaining: number}` | Update skill cooldown |

---

## Troubleshooting

### UI không update

**Kiểm tra:**
1. ✅ UIManager có trong scene không?
2. ✅ Component đã subscribe đúng event type chưa?
3. ✅ Publisher đã publish với event type đúng chưa?
4. ✅ Data structure có đúng format không?

**Debug:**
```typescript
public onUIEvent(eventType: string, data: any): void {
    console.log('Received event:', eventType, data); // Debug log
    // ...
}
```

### Memory Leak

**Nguyên nhân:** Không unsubscribe khi component destroy

**Giải pháp:**
```typescript
onDestroy() {
    // Luôn cleanup
    const uiManager = UIManager.getInstance();
    if (uiManager) {
        uiManager.unsubscribe(this, 'MY_EVENT');
    }
}
```

### Multiple Subscribers

Nếu nhiều components subscribe cùng event, **TẤT CẢ** sẽ nhận notification:

```typescript
// Behavior bình thường - TẤT CẢ nhận event
EXPController.onUIEvent('EXP_CHANGED', data)
EXPAnimationController.onUIEvent('EXP_CHANGED', data)
EXPSoundController.onUIEvent('EXP_CHANGED', data)
```

---

## Advanced Usage

### Conditional Publishing

Chỉ publish khi có thay đổi thực sự:

```typescript
private _lastHealth: number = 100;

private _checkHealth(): void {
    if (this._currentHealth !== this._lastHealth) {
        this._lastHealth = this._currentHealth;
        
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.publish('HEALTH_CHANGED', {
                current: this._currentHealth,
                max: this._maxHealth
            });
        }
    }
}
```

### Batch Updates

Nếu nhiều stats thay đổi cùng lúc, publish 1 event thay vì nhiều:

```typescript
// ✅ Good - 1 event
uiManager.publish('PLAYER_STATS_CHANGED', {
    health: this._health,
    mana: this._mana,
    stamina: this._stamina
});

// ❌ Bad - 3 events
uiManager.publish('HEALTH_CHANGED', {health: this._health});
uiManager.publish('MANA_CHANGED', {mana: this._mana});
uiManager.publish('STAMINA_CHANGED', {stamina: this._stamina});
```

---

## Checklist Khi Tạo UI Component Mới

- [ ] Implement `IUISubscriber` interface
- [ ] Subscribe vào events trong `start()`
- [ ] Unsubscribe trong `onDestroy()`
- [ ] Implement `onUIEvent()` với type checking
- [ ] Validate data trước khi dùng
- [ ] Cache component references trong `onLoad()` hoặc `start()`
- [ ] Test với nhiều scenarios (normal, edge cases)
- [ ] Document event type và data structure

---

## Files Liên Quan

| File | Path | Mô tả |
|------|------|-------|
| UIManager | `assets/UI/Script/UIManager.ts` | Core singleton manager |
| IUISubscriber | `assets/UI/Script/IUISubscriber.ts` | Interface cho subscribers |
| EXPController | `assets/UI/Script/EXPController.ts` | Example implementation |
| TimerController | `assets/UI/Script/TimerController.ts` | Timer UI component |

---

**Tài liệu được tạo:** 2025-12-18  
**Version:** 1.0  
**System:** UI Manager với Pub-Sub Pattern
