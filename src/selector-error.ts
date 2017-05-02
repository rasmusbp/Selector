export interface ISelectorError<ItemType> {
    error: Error;
    item: ItemType;
    reason: string;
}
export default class SelectorError <ItemType>{
    error: Error;
    item: ItemType;
    reason: string;
    constructor(message, reason, item) {
        this.error = new Error(message);
        this.reason = reason;
        this.item = item;
    }
}