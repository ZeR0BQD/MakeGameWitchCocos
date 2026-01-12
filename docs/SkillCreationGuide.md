# Hướng Dẫn Tạo Kỹ Năng Mới (Skill Creation Guide)

Tài liệu này là chuẩn mực (source of truth) cho quy trình phát triển kỹ năng trong dự án.

## 1. Kiến Trúc Hệ Thống (System Architecture)

Hệ thống kỹ năng vận hành dựa trên sự phối hợp giữa **Spawner**, **Controller** và **Spawn System**.

### 1.1 Luồng Dữ Liệu (Data Flow)
Quy trình từ lúc quái chết đến khi người chơi nhận được skill:

1.  **Drop (Rớt đồ)**:
    *   Quái chết -> Gửi sự kiện `enemyDie`.
    *   `InstanceSkills` xử lý tỷ lệ rớt (`bubbleDropRate`) và chọn skill phù hợp với Level người chơi (dùng `ConfigLoader` & Milestone).
2.  **Delivery (Vận chuyển)**:
    *   `InstanceSkills` tạo ra **Bubble**.
    *   Bubble được "tiêm" dữ liệu: Tên Skill (`skillName`) và Icon (`Sprite`).
3.  **Pickup (Nhặt)**:
    *   Người chơi chạm vào Bubble -> `BubbleController` kích hoạt.
    *   `BubbleController` gọi `SkillsManager.addSkill(skillName)`.
4.  **Activation (Kích hoạt)**:
    *   `SkillsManager` load Prefab tương ứng từ config.
    *   Script Spawner (VD: `SpawnLightBullet`) khởi chạy và đăng ký vào hệ thống.

### 1.2 Thành Phần Cốt Lõi (Core Components)

| Thành Phần | Vai Trò | Ví Dụ |
| :--- | :--- | :--- |
| **Controller** | Logic vật lý của vật thể (đạn, kiếm). Quản lý di chuyển, va chạm. | `LightBulletCtrl.ts` |
| **Spawner** | Logic quản lý skill trên Player. Sinh vật thể, tính Cooldown. | `SpawnLightBullet.ts` |
| **InstanceSkills** | Quản lý việc rớt skill từ quái. Chọn skill ngẫu nhiên. | `InstanceSkills.ts` |
| **ConfigLoader** | Load file `game_config.json` (Meta data, tỷ lệ drop). | `ConfigLoader.ts` |

---

## 2. Cấu Hình & Dữ Liệu (Configuration)

Hiện tại hệ thống sử dụng cơ chế **Hybrid Config**:

*   **Meta Data (JSON)**: Lưu trong `game_config.json`.
    *   Dùng để định nghĩa: Đường dẫn Prefab, Đường dẫn Icon, Tỷ lệ rớt (Drop Rate).
*   **Stats (Hardcoded)**: Lưu cứng trong Code hoặc chỉnh trong Editor.
    *   Dùng để định nghĩa: Damage, Tốc độ, Cooldown, Số lượng stack.

> [!NOTE]
> Khi tạo skill mới, bạn cần khai báo trong `game_config.json` để hệ thống Drop nhận diện được, nhưng chỉnh chỉ số sức mạnh thì chỉnh trực tiếp trong Prefab/Script.

---

## 3. Quy Trình Tạo Skill Mới (Step-by-Step)

### Bước 1: Tạo Script Controller
Script gắn lên vật thể bay/đạn.

```typescript
// Mẫu chuẩn: FireBallCtrl.ts
@ccclass('FireBallCtrl')
export class FireBallCtrl extends SkillsCollider {
    @property({ override: true }) damage: number = 20;

    protected onEnable() {
        this._hasHit = false; // Reset trạng thái va chạm
        // Reset các biến logic khác (hướng bay, timer...)
    }

    protected onHit(target: IDamageable): void {
        // Logic khi trúng địch
        this.requestReturn();
    }

    private requestReturn() {
        this.node.emit('return-to-pool'); // Gửi tín hiệu thu hồi
    }
}
```

### Bước 2: Tạo Script Spawner
Script gắn lên Player.

```typescript
// Mẫu chuẩn: SpawnFireBall.ts
@ccclass('SpawnFireBall')
export class SpawnFireBall extends SpawnAroundPlayer implements ISkill {
    // 1. Config Interface
    public readonly skillName: string = 'FireBall';
    public readonly maxCooldown: number = 3.0;
    public readonly maxStacks: number = 0;
    public readonly activateKeyCode: KeyCode = KeyCode.KEY_F;

    // 2. Lifecycle
    onLoad() {
        super.onLoad();
        SkillsManager.instance?.registerSkill(this);
    }
    onDestroy() {
        SkillsManager.instance?.unregisterSkill(this.skillName);
    }

    // 3. Setup Object từ Pool
    protected onSpawned(bullet: Node, angle: number, isRedistribute: boolean): void {
        const ctrl = bullet.getComponent(FireBallCtrl);
        // Setup hướng bay, vị trí cho ctrl...

        // Lắng nghe thu hồi (Safe Mode)
        bullet.off('return-to-pool');
        bullet.on('return-to-pool', () => {
            this.scheduleOnce(() => { // Defer để tránh lỗi Physics
                this._pool.returnObject(bullet);
            }, 0);
        }, this);
    }
}
```

### Bước 3: Setup Editor & Config

1.  **Prefab**: Tạo Prefab đạn, gắn `BoxCollider2D` (Sensor) và Script Controller.
2.  **Player**: Gắn Script Spawner vào Player, kéo Prefab đạn vào.
3.  **Game Config**: Mở `game_config.json`, thêm entry cho skill mới:
    ```json
    "Skills": {
        "FireBall": {
            "prefab": "path/to/prefab",
            "sprite": "path/to/icon"
        }
    }
    ```

---

## 4. Best Practices (Quy Tắc Vàng)

1.  **Luôn dùng `scheduleOnce` khi thu hồi trong Physics Callback**: Để tránh lỗi "Can not active RigidBody in contract listener".
2.  **Luôn `obj.off()` trước khi `obj.on()`**: Để tránh nhân đôi event listener khi tái sử dụng object từ pool.
3.  **Implement `ISkill` đầy đủ**: Để Skill hiển thị đúng trên UI Menu và thanh Cooldown.
4.  **Đặt tên nhất quán**: Tên trong code (`skillName`), tên trong `game_config.json`, và tên file Prefab nên giống nhau để dễ debug.
