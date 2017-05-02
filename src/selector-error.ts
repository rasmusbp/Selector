export interface ISelectorError<T> {
    data: T;
    message: string;
    reason: string;
}

export interface ISelectorErrorClass<T> extends ISelectorError<T> {
    print({ level: string }) : SelectorError<T>;
}

export default class SelectorError<T> implements ISelectorErrorClass<T>{
    data: T;
    message: string;
    reason: string;

    constructor ({ message, reason, data }) {
        this.message = message;
        this.reason = reason;
        this.data = data;
    }
    
    print ({ level }) {
        switch (level) {
            case 'throw':
                throw new Error(this.message);
            case 'soft_throw':
                console.error(this.message, this.data);
                break;
            case 'warn':
                console.warn(this.message, this.data);
                break;
            case 'log':
                console.log(this.message, this.data);
                break;         
            default:
                console.log(this.message, this.data);
                break;
        }
        return this;
    }
}