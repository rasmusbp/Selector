// Type definitions for Selector 1.0.0
// Project: [~THE PROJECT NAME~]
// Definitions by: Rasmus Bangsted Pedersen <https://github.com/rasmusbp/Selector>

declare namespace Slc {

    export class Selector<T,P> {
        constructor (state : Slc.StateInput<T, P> | T[], settings : Slc.Settings);

        /**
         * Set new state
         * 
         * @param {(Slc.StateInput<T,P> | T[])} newState 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        setState (newState : Slc.StateInput<T,P> | T[]) : Selector<T,P>;

        /**
         * Apply set of changes
         * 
         * @param {Slc.ChangeInput} changes 
         * @returns {Selector} 
         * 
         * @memberof Selector
         */
        applyChange (changes : Slc.ChangeInput<T,P>) : Selector<T,P>;

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
         * @param {Slc.Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        select(input: Slc.Predicate<T>) : Selector<T,P>;

        /**
         * Select all items
         * 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        selectAll() : Selector<T,P>;

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
         * @param {Slc.Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        remove(input: Slc.Predicate<T>) : Selector<T,P>;

        /**
         * Remove all items (will deselect all items as well)
         * 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        removeAll() : Selector<T,P>;

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
         * @param {Slc.Predicate} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselect(input: Slc.Predicate<T>) : Selector<T,P>;

         /**
         * Deselect all items
         * 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        deselectAll() : Selector<T,P>;

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
         * @param {Slc.Iterator} input 
         * @returns {Selector<T,P>} 
         * 
         * @memberof Selector
         */
        add(input: Slc.Iterator<T,P>) : Selector<T,P>;

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
         * Subscribe to all changes of instance's state
         * 
         * @param {Slc.Observer<T,P>} observer 
         * @param {Slc.ErrorObserver<T,P>} [errorObserver] 
         * @returns {Slc.Unsubscriber}
         * 
         * @memberof Selector
         */
        subscribe (observer : Slc.Observer<T,P>, errorObserver? : Slc.ErrorObserver<T,P>) : Slc.Unsubscriber;

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
         * @param {Slc.Iterator} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        has (input : Slc.Iterator<T,P>) : boolean;

        /**
         * Check if some items exist
         * 
         * @param {T[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        hasSome (input : T[]) : boolean;

        /**
         * Check if some items exist based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        hasSome (input : P[]) : boolean;

        /**
         * Check if some items exist based on return value of predicate
         * 
         * @param {Slc.Predicate} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        hasSome (input : Slc.Predicate<T>) : boolean;

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
         * @param {Slc.Predicate} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSelected (input: Slc.Predicate<T>) : boolean;

        /**
         * Check if item is the only selected
         * 
         * @param {T} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isOnlySelected (input: T) : boolean;
        
        /**
         * Check if items in array are the only selected
         * 
         * @param {T[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isOnlySelected (input: T[]) : boolean;

        /**
         * Check if a single item is the only selected based on property
         * (track-by mode only)
         * 
         * @param {P} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isOnlySelected (input: P) : boolean;

        /**
         * Check if items in array are the only selected based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isOnlySelected (input: P[]) : boolean;

        /**
         * Check if items(s) are the only selected based on return value of predicate
         * 
         * @param {Slc.Predicate} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isOnlySelected (input: Slc.Predicate<T>) : boolean;
        
        /**
         * Check if some items in array are selected
         * 
         * @param {T[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSomeSelected (input: T[]) : boolean;

        /**
         * Check if some items in array are selected based on properties
         * (track-by mode only)
         * 
         * @param {P[]} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSomeSelected (input: P[]) : boolean;

         /**
         * Check if some items are selected based on return value of predicate
         * 
         * @param {Slc.Predicate} input 
         * @returns {boolean} 
         * 
         * @memberof Selector
         */
        isSomeSelected (input: Slc.Predicate<T>) : boolean;

         /**
          * True if all items are selected
          * 
          * @type {boolean}
          * @memberof Selector
          */
        isAllSelected: boolean;

        /**
          * True if some items are selected
          * 
          * @type {boolean}
          * @memberof Selector
          */
        hasSelections: boolean;

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

    interface State<T,P> {
        items: T[];
        selected: T[];
    }

    interface StateInput<T,P> {
        items: T[] | Function;
        selected: T[ ] | P[] | Function;
    }

    interface Change<T> {
        select? : T[];
        deselect? : T[];
        add? : T[];
        remove? : T[];
    }

    interface ChangeInput<T,P> {
        select? : T[] | P[] | Function;
        deselect? : T[] | P[] | Function;
        add? : T[] | Function;
        remove? : T[] | P[] | Function;
    }

    interface Observer<T,P> {
        (changes: Change<T>, state: State<T,P>, selector: Selector<T,P>): void;
    }

    interface ErrorObserver<T,P> {
        (errors: any, state: State<T,P>, selector: Selector<T,P>): void;
    }

    interface Predicate<T> {
        (item: T, index: number) : boolean;
    }

    interface Iterator<T,P> {
        (state: State<T,P>) : T | T[] | P | P[];
    }

    interface Unsubscriber {
        () : void;
    }
}

declare module "Slc" {
   export = Slc;
}