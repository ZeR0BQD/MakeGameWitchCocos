/**
 * Interface cho các controller có thể load config
 * Controller nào muốn dùng ConfigSetter phải implement interface này
 */
export interface IConfigurable {
    /**
     * Map từ key trong config file → tên biến private/protected trong class
     * 
     * VD: {
     *   "maxHP": "_maxHP",
     *   "speed": "_speed"
     * }
     */
    readonly _keyToVariable: Record<string, string>;
}
