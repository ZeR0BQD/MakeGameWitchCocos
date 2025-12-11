export interface IUISubscriber {
    onUIEvent(eventType: string, data: any): void;
}
