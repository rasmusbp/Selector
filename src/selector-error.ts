export interface ISelectorError<T> {
    data: T;
    message: string;
    reason: string;
}

export interface ISelectorErrorClass<T> extends ISelectorError<T> {
    print({ level: string }) : SelectorError<T>;
}

export interface ILogOptions {
    level: 'throw' | 'error' | 'warn' | 'log' | 'silent'
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
    
    print (options: ILogOptions) {
        switch (options.level) {
            case 'throw':
                throw new Error(this.message);
            case 'error':
                console.error(this.message, this.data);
                break;
            case 'warn':
                console.warn(this.message, this.data);
                break;
            case 'log':
                console.log(this.message, this.data);
                break; 
            case 'silent':
                break;        
            default:
                console.log(this.message, this.data);
                break;
        }
        return this;
    }
}