export default class DeveloperMessage {
    message: string;
    args: any;
    constructor (message, ...args) {
        this.message = message;
        this.args = [...args];
    }
    print ({ level }) {
        switch (level) {
            case 'throw':
                throw new Error(this.message + JSON.stringify(this.args));
            case 'soft_throw':
                console.error(this.message, ...this.args);
                break;
            case 'warn':
                console.warn(this.message, ...this.args);
                break;
            case 'log':
                console.log(this.message, ...this.args);
                break;         
            default:
                console.log(this.message, ...this.args);
                break;
        }
        return this;
    }
}