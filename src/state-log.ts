export default class StateLog<T> {
    message: string;
    reason: string;
    data: any;

    constructor ({ message, reason, data }) {
        Object.defineProperties(this, {
            message: {
                get: () => message
            },
            reason: {
                get: () => reason
            },
            data: {
                get: () => data
            },
            
        });
    }

    print (options = { level: '' }) {
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