export interface IUpgradeSubscriber {
    onUpgradeEvent(upgradeType: string, data: any): void;
}
