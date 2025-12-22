/**
 * Interface cho các controller có thể load config
 * Controller nào muốn dùng ConfigSetter phải implement interface này
 */
export interface IConfig {
    /**
     * Map từ key trong file 
     * 
     * VD: {
     *   "maxHP": "_maxHP",
     *   "speed": "_speed"
     * }
     */
    readonly _keyToVariable: Record<string, string>;

    /**
     * REQUIRED: Path đến config data trong JSON tree
     * VD: "player/playerStats" hoặc "cardUpgrade/upgradeBaseStats/cardUpgradeLv1"
     * KHÔNG để trống - sẽ báo lỗi nếu không set
     */
    readonly configPath?: string;  // Optional trong type nhưng required trong runtime
}
