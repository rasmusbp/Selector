// Type definitions for Selector 1.0.0
// Project: [~THE PROJECT NAME~]
// Definitions by: Rasmus Bangsted Pedersen <https://github.com/rasmusbp/Selector>

declare namespace Slc {
    export class StateError<T> {
        /**
         * Data that caused the error
         * 
         * @type {T}
         * @memberof StateError
         */
        readonly data: T;

        /**
         * Human-readable message
         * 
         * @type {string}
         * @memberof StateError
         */
        readonly message: string;

        /**
         * Reason for error
         * 
         * @type {string}
         * @memberof StateError
         */
        readonly reason: string;

        /**
         * Log or throw the error
         * 
         * @param {options} { level: string } 
         * @returns {StateError<T>} 
         * 
         * @memberof StateError
         */
        print(options?: { level: string}) : StateError<T>;
    }

    export interface LogOptions {
        level: string
    }

    export class Selector<T,P> {
        constructor (state : StateLike<T, P> | T[], config : Settings);

        /**
         * Set new state
         * 
         * @param {(StateLike<T,P> | T[])} newState 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        setState (newState : StateLike<T,P> | T[]) : Selector<T,P>;

        /**
         * Apply set of changes
         * 
         * @param {ChangeLike} changes 
         * @returns {Selector} 
         * 
         * @memberof Selector
         */
        applyChange (changes : ChangeLike<T,P>) : Selector<T,P>;

        /**
         * Reset to initial state
         * 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        reset() : Selector<T,P>;

        /**
         * Select a single item
         * 
         * @param {T} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: T) : Selector<T,P>;

        /**
         * Select an array of items
         * 
         * @param {T[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: T[]) : Selector<T,P>;

        /**
         * Select a single item based on property
         * (in track-by mode)
         * 
         * @param {P} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: P): Selector<T,P>;

        /**
         * Select an array of items based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: P[]) : Selector<T,P>;

        /**
         * Select a single item based on return value of predicate
         * 
         * @param {Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: Predicate<T>) : Selector<T,P>;

        /**
         * Remove a single item
         * 
         * @param {T} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: T) : Selector<T,P>;

        /**
         * Remove an array of items
         * 
         * @param {T[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: T[]) : Selector<T,P>;

        /**
         * Remove a single item based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: P): Selector<T,P>;

        /**
         * Remove an array of items based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: P[]) : Selector<T,P>;

        /**
         * Remove a single item based on return value of predicate
         * 
         * @param {Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: Predicate<T>) : Selector<T,P>;

        /**
         * Deselect a single item
         * 
         * @param {T} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: T) : Selector<T,P>;

        /**
         * Deselect an array of items
         * 
         * @param {T[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: T[]) : Selector<T,P>;

        /**
         * Deselect a single item based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: P): Selector<T,P>;

        /**
         * Deselect an array of items based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: P[]) : Selector<T,P>;

        /**
         * Deselect a single item based on return value of predicate
         * 
         * @param {Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: Predicate<T>) : Selector<T,P>;

        /**
         * Toggle the state of a single item
         * 
         * @param {T} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        toggle (input : T) : Selector<T,P>

        /**
         * Toggle the state of an array of items
         * 
         * @param {T[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        toggle (input : T[]) : Selector<T,P>

        /**
         * Toggle the state of a single item based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        toggle (input : P) : Selector<T,P>

        /**
         * Toggle the state of an array of items based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        toggle (input : P[]) : Selector<T,P>

        /**
         * Toggle the state of item(s) based on the return value of predicate
         * 
         * @param {Predicate<T>} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        toggle (input : Predicate<T>) : Selector<T,P>

        /**
         * Add a single item
         * 
         * @param {T} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        add(input: T) : Selector<T,P>;

        /**
         * Add an array of items to instance.
         * 
         * @param {T[]} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        add(input: T[]) : Selector<T,P>;

        /**
         * Add item to instance based on return value of iterator
         * 
         * @param {Iterator} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        add(input: Iterator<T>) : Selector<T,P>;

        /**
         * Filter current state
         * 
         * @param {Predicate<T>} predicate 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        filter(predicate: Predicate<T>) : Selector<T,P>;

        /**
         * Swap an existing item for a new item
         * 
         * @param {T} input 
         * @param {T} newItem 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        swap(input : T, newItem : T) : Selector<T,P>;

        /**
         * Swap an existing item for a new item based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @param {T} newItem 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        swap(input : P, newItem : T) : Selector<T,P>;

        /**
         * Revert provided change, i.e added items becomes removed items.
         * 
         * @static
         * @param {Change<T>} change 
         * 
         * @memberof Selector
         */
        revert(change: Change<T>) : Selector<T,P>

        /**
         * Subscribe to all changes of instance's state
         * 
         * @param {Observer} observer 
         * @param {ErrorObserver} [errorObserver] 
         * @returns {Unsubscriber}
         * 
         * @memberof Selector
         */
        subscribe (observer : Observer<T,P>, errorObserver? : ErrorObserver<T,P>) : Unsubscriber;

        /**
         * Check if some items of current state meet specified condition(s)
         * 
         * @param {Predicate<T>} predicate 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        some (predicate : Predicate<T>) : boolean;

        /**
         * Check if all items of current state meet specified conditions(s)
         * 
         * @param {Predicate<T>} predicate 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        every (predicate : Predicate<T>) : boolean;

        /**
         * Check existence of a single item
         * 
         * @param {T} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : T) : boolean;

        /**
         * Check existence of an array of items
         * 
         * @param {T[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : T[]) : boolean;

        /**
         * Check existence of a single item based on properties
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : P) : boolean;

        /**
         * Check existence of an array of items based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : P[]) : boolean;

        /**
         * Check existence of item(s) based on return value of iterator
         * 
         * @param {Iterator} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : Predicate<T>) : boolean;

        /**
         * Check if item is selected
         * 
         * @param {T} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: T) : boolean;
        
        /**
         * Check if all items in array are selected
         * 
         * @param {T[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: T[]) : boolean;

        /**
         * Check if a single item is selected based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: P) : boolean;

        /**
         * Check if all items in array are selected based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: P[]) : boolean;

        /**
         * Check if item(s) are selected based on return value of predicate
         * 
         * @param {Predicate} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: Predicate<T>) : boolean;

        /**
          * True if instance are valid based on provided validators
          * 
          * @type {boolean}
          * @memberof Selector
          */
        isValid: boolean;

        /**
         * Current state of the instance
         * 
         * @type {{
         *             items: T[],
         *             selected: T[]
         *         }}
         * @memberof Selector
         */
        state: {
            items: T[],
            selected: T[]
        };
    }
    
    interface Providers {
        Error: any;
    }

    interface Settings {
        trackBy?: string;
        strict?: boolean;
        debug?: boolean;
        validators?: Function[];
        providers?: Providers;
    }

    interface Config extends Settings {
        logLevel?: string;
    }

    interface State<T> {
        items: T[];
        selected: T[];
    }

    interface StateLike<T,P> {
        items: T[] | Iterator<T>;
        selected: T[] | P[] | Predicate<T>;
    }

    interface ItemState<T> {
        value: T;
        selected: boolean;
        filtered: boolean;
    }

    interface Change<T> {
        readonly select : T[];
        readonly deselect : T[];
        readonly add : T[];
        readonly remove : T[];
    }

    interface ChangeLike<T,P> {
        select? : T[] | P[] | Predicate<T>;
        deselect? : T[] | P[] | Predicate<T>;
        add? : T[] | Iterator<T>;
        remove? : T[] | P[] | Predicate<T>;
    }

    interface Observer<T,P> {
        (changes: Change<T>, state: State<T>, selector: Selector<T,P>): void;
    }

    interface ErrorObserver<T,P> {
        (errors: StateError<T>[], state: State<T>, selector: Selector<T,P>): void;
    }

    interface Predicate<T> {
        (input: { value: T, selected: boolean }) : boolean;
    }

    interface Iterator<T> {
        (state: State<T>, initialState: State<T>) : T | T[];
    }

    interface Unsubscriber {
        () : void;
    }
}

declare module "Slc" {
   export = Slc;
}