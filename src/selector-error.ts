export interface ISelectorError<T> {
    error: Error;
    item: T;
}
export default class SelectorError <T>{
    error: Error;
    item: T;
    constructor(message, item) {
        this.error = new Error(message);
        this.item = item;
    }
}