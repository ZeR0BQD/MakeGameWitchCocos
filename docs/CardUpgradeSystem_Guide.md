# Card Upgrade System - Hướng Dẫn Mở Rộng

## Tổng Quan Hệ Thống

Hệ thống card upgrade được thiết kế theo **Injection Pattern** với random logic dựa trên **TFT drop rate mechanics**.

**Kiến trúc:**
- `InstanceCard`: Random card type + rarity → inject vào CardUpgrade
- `CardUpgrade`: Nhận data → load config → apply stats
- `PlayerController`: Nhận và xử lý upgrade

---

## Cách Thêm Chỉ Số Mới

### Scenario 1: Thêm Card Type Mới

Ví dụ: Thêm **CardUpgradeDamage** (tăng damage)

#### Bước 1: Cập nhật `game_config.json`

Thêm section mới trong `cardUpgrade`:

```json
{
  "cardUpgrade": {
    "cardUpgradeHP": { ... },
    "cardUpgradeEXP": { ... },
    "cardUpgradeSpeed": { ... },
    
    "cardUpgradeDamage": {
      "common": { "damage": 5 },
      "rare": { "damage": 10 },
      "epic": { "damage": 20 }
    }
  }
}
```

#### Bước 2: Thêm vào Random Pool (`InstanceCard.ts`)

File: `assets/Core/Upgrade/InstanceCard.ts`

```typescript
private _cardTypes: string[] = [
    'cardUpgradeHP', 
    'cardUpgradeEXP', 
    'cardUpgradeSpeed',
    'cardUpgradeDamage'  // ← THÊM MỚI
];
```

#### Bước 3: Mapping Config Key (`CardUpgrade.ts`)

File: `assets/Core/Upgrade/CardUpgrade.ts`

```typescript
readonly _keyToVariable: Record<string, string> = {
    "maxHP": "_maxHP",
    "maxEXP": "_maxEXP",
    "speed": "_speed",
    "damage": "_damage"  // ← THÊM MỚI
};

// Thêm biến lưu stat
private _damage: number = 0;
```

#### Bước 4: Support trong PlayerController (`PlayerController.ts`)

File: `assets/Player/Script/Core/PlayerController.ts`

**Thêm property:**

```typescript
@property({ tooltip: 'Damage hiện tại' })
private _damage: number = 10;

public get damage(): number {
    return this._damage;
}
```

**Thêm vào mapping (nếu cần load từ config):**

```typescript
public readonly _keyToVariable = {
    "maxHP": "_maxHP",
    "maxEXP": "_maxEXP",
    "speed": "_speed",
    "damage": "_damage"  // ← THÊM MỚI
};
```

**Thêm case trong `processUpgrade()`:**

```typescript
protected processUpgrade(upgradeData: { type: string, value: number }): void {
    switch (upgradeData.type) {
        // ... existing cases ...
        
        case 'DAMAGE':
            this._damage += upgradeData.value;
            break;
    }
}
```

#### Bước 5: Apply Upgrade (`CardUpgrade.ts`)

File: `assets/Core/Upgrade/CardUpgrade.ts`

```typescript
private _applyUpgradeToPlayer(): void {
    const player = PlayerController._instance;
    if (!player) return;

    // ... existing stats ...
    
    if (this._damage !== 0) {
        player.applyUpgrade({ type: 'DAMAGE', value: this._damage });
    }
}
```

---

### Scenario 2: Thêm Stat Phụ Vào Card Hiện Có

Ví dụ: Card HP vừa tăng HP vừa tăng Defense

#### Bước 1: Cập nhật Config

```json
"cardUpgradeHP": {
  "common": { 
    "maxHP": 20,
    "defense": 3  // ← THÊM
  },
  "rare": { 
    "maxHP": 40,
    "defense": 7  // ← THÊM
  },
  "epic": { 
    "maxHP": 80,
    "defense": 15 // ← THÊM
  }
}
```

#### Bước 2-5: Giống Scenario 1

Làm theo **Bước 3, 4, 5** ở Scenario 1 để thêm defense stat.

---

## Checklist Khi Thêm Chỉ Số Mới

- [ ] **Config**: Thêm stat vào `game_config.json`
- [ ] **InstanceCard**: Thêm card type vào `_cardTypes` array (nếu là card type mới)
- [ ] **CardUpgrade**: 
  - [ ] Thêm mapping trong `_keyToVariable`
  - [ ] Thêm private variable `_statName`
  - [ ] Thêm apply logic trong `_applyUpgradeToPlayer()`
- [ ] **PlayerController**:
  - [ ] Thêm property `_statName`
  - [ ] Thêm getter/setter (nếu cần)
  - [ ] Thêm case trong `processUpgrade()`
  - [ ] Thêm vào `_keyToVariable` (nếu cần load từ config)

---

## Example: Thêm Attack Speed

### 1. Config (`game_config.json`)

```json
"cardUpgradeAttackSpeed": {
  "common": { "attackSpeed": 0.05 },
  "rare": { "attackSpeed": 0.10 },
  "epic": { "attackSpeed": 0.20 }
}
```

### 2. InstanceCard (`InstanceCard.ts`)

```typescript
private _cardTypes: string[] = [
    'cardUpgradeHP',
    'cardUpgradeEXP',
    'cardUpgradeSpeed',
    'cardUpgradeAttackSpeed'
];
```

### 3. CardUpgrade (`CardUpgrade.ts`)

```typescript
readonly _keyToVariable: Record<string, string> = {
    "maxHP": "_maxHP",
    "maxEXP": "_maxEXP",
    "speed": "_speed",
    "attackSpeed": "_attackSpeed"
};

private _attackSpeed: number = 0;

// Trong _applyUpgradeToPlayer()
if (this._attackSpeed !== 0) {
    player.applyUpgrade({ type: 'ATTACK_SPEED', value: this._attackSpeed });
}
```

### 4. PlayerController (`PlayerController.ts`)

```typescript
@property({ tooltip: 'Attack speed multiplier' })
private _attackSpeed: number = 1.0;

public get attackSpeed(): number {
    return this._attackSpeed;
}

// Trong processUpgrade()
case 'ATTACK_SPEED':
    this._attackSpeed += upgradeData.value;
    break;
```

---

## Lưu Ý Quan Trọng

### ConfigLoader Auto-Mapping

ConfigLoader tự động map config keys → component variables dựa trên `_keyToVariable`. 

**Quy tắc:**
- Key trong config (VD: `"damage"`) phải match với key trong `_keyToVariable`
- Value trong `_keyToVariable` phải là tên biến chính xác (VD: `"_damage"`)

### Upgrade Type Naming Convention

Trong `PlayerController.processUpgrade()`:

- Config key: lowercase hoặc camelCase (`damage`, `attackSpeed`)
- Upgrade type: UPPER_SNAKE_CASE (`DAMAGE`, `ATTACK_SPEED`)
- Variable: _camelCase (`_damage`, `_attackSpeed`)

### Drop Rate Table

Drop rate table được chia sẻ cho **TẤT CẢ** card types. Không cần config riêng cho từng type.

---

## Files Cần Modify

Khi thêm stat mới, bạn sẽ modify 4 files:

1. `assets/resources/database/configs/game_config.json` - Config values
2. `assets/Core/Upgrade/InstanceCard.ts` - Card pool (nếu là card type mới)
3. `assets/Core/Upgrade/CardUpgrade.ts` - Mapping và apply logic
4. `assets/Player/Script/Core/PlayerController.ts` - Player stat và upgrade handling

---

## Troubleshooting

### Stat không được apply

**Kiểm tra:**
1. Key trong config có match với `_keyToVariable` không?
2. Upgrade type trong `CardUpgrade` có đúng với case trong `PlayerController.processUpgrade()` không?
3. Variable name có đúng format `_statName` không?

### Card không random được

**Kiểm tra:**
1. Card type đã thêm vào `_cardTypes` array chưa?
2. Config path có đúng format `cardUpgrade/cardTypeNmae/rarity` không?

### ConfigLoader báo lỗi

**Kiểm tra:**
1. `_keyToVariable` có khai báo đầy đủ không?
2. Private variables đã được khởi tạo với giá trị mặc định chưa?

---

## Best Practices

1. **Consistent Naming**: Đặt tên stat nhất quán giữa config, code, và UI
2. **Default Values**: Luôn set giá trị mặc định cho private variables
3. **Type Safety**: Sử dụng TypeScript types rõ ràng
4. **Testing**: Test từng stat riêng biệt trước khi combine

---

**Tài liệu được tạo:** 2025-12-17  
**Version:** 1.0  
**System:** Card Upgrade với TFT Drop Rate Mechanics
