/**
 * Interface cho UI Subscribers
 * Tất cả UI components (HPController, EXPController, etc.) phải implement interface này
 */
export interface IUISubscriber {
    /**
     * Method được gọi khi UIManager publish event
     * @param eventType - Loại event ('HP_CHANGED', 'EXP_CHANGED', etc.)
     * @param data - Dữ liệu đi kèm
     */
    onUIEvent(eventType: string, data: any): void;
}
