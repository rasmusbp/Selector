import errors from './error-messages';
import {default as SelectorError, ISelectorError, ILogOptions} from './selector-error';

export interface ISelectorState<T> {
    items: T[];
    selections: any[];
}

export interface ISelectorProviders {
    Error: any;
}

export interface ISelectorSettings {
    trackBy?: string;
    strict?: boolean;
    debug?: boolean;
    validators?: Function[];
    providers?: ISelectorProviders;
}

export interface ISelectorConfig extends ISelectorSettings {
    logLevel?: string;
}

export interface ISelectorChange<T> {
    selected? : T[];
    deSelected? : T[];
    added? : T[];
    removed? : T[];
}

export interface ISelectorChangeInput<T,P> {
    selected? : T[]|P[]|Function;
    deSelected? : T[]|P[]|Function;
    added? : T[]|Function;
    removed? : T[]|P[]|Function;
}

export interface ISelector<T,P> extends Selector<T,P> {
    
}

export interface ISuccesObserver<T,P> {
    (changes: ISelectorChange<T>, state: ISelectorState<T>, selector: ISelector<T,P>): void;
}

export interface IErrorObserver<T,P> {
    (errors: any, state: ISelectorState<T>, selector: ISelector<T,P>): void;
}

const internals = new WeakMap();
const noop = () => {};
const ADDED = 'added';
const REMOVED = 'removed';
const SELECTED = 'selected';
const DESELECTED = 'deSelected';

class Selector <ItemType = any, TrackByType = any> {
    constructor (initialState : ISelectorState<ItemType> | ItemType[] = {
        items: [],
        selections: []
    }, settings : ISelectorSettings) {


        const itemsMap = new Map();
        const selectionsMap = new Map();
        const subscribers = new Set();
        const config : ISelectorConfig = Object.assign({
            trackBy: undefined,
            strict: false,
            debug: false,
            validators: [() => true],
            providers: Object.assign({
                Error: SelectorError
            }, settings.providers)
        }, settings);

        config.logLevel = config.strict ? 'error' : 'warn';

        function createStateError({ reason, data, context = 'Selector' }) {
            const errFn = errors[reason] || (() => 'null');
            const ErrorProvider = config.providers.Error;
            return new ErrorProvider({
                message: `Selector@${errFn(context)}`,
                reason,
                data
            });
        }
        
        function getChangeErrors (changes) {
            const ErrorProvider = config.providers.Error;
            const errors = Object.keys(changes).reduce((errors, action) => {
                return [...errors, ...changes[action].filter(change => change instanceof ErrorProvider)];
            }, []);
            return errors.length ? errors : undefined;
        }

        function addTo (map, items) {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                map.set(key, item);
                return [...hits, item];
            }, []);
        }

        function removeFrom (map, items) {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                const wasRemoved = map.delete(key);                
                return wasRemoved ? [...hits, item] : hits;
            }, []);
        }

        function dispatch (changes) {
            const errors = ifStrict(getChangeErrors(changes));
            subscribers.forEach((observers) => {
                const args = [this.state, this];
                if (errors) {
                    observers.error(errors, ...args);
                    return;
                } 
                observers.success(changes, ...args);
            });
        }

        function get (item) {
            return itemsMap.get(resolveKey(item));
        } 

        function has (item) {
            return itemsMap.has(resolveKey(item));
        }

        function isSelected (item) {
            return selectionsMap.has(resolveKey(item));
        }

        function log(errors = [], level = config.logLevel) {
            if (ifStrict(errors) || config.debug) {
                errors.forEach(error => error.print({ level }))
            }
        }

        function ifStrict(val) {
            return config.strict ? val : undefined;
        }

        const resolverFor = {
            all: {
                validate: item => item
            },
            existing: {
                validate: get
            },
            adding: {
                iterator(state, predicate) {
                    return predicate(state);
                },
                validate(item, context) {
                    return !has(item) ? item : createStateError({
                        reason: 'ALREADY_EXIST',
                        data: item,
                        context,
                    });
                }
            },
            getting: {
                validate(item, context) {
                    return has(item) ? get(item) : createStateError({
                        reason: 'NOT_EXIST',
                        data: item,
                        context,
                    });
                }
            },
            selecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createStateError({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    } else if (isSelected(item)) {
                        return createStateError({
                            reason: 'ALREADY_SELECTED',
                            data: get(item),
                            context,
                        })
                    } else {
                        return get(item);
                    }
                }
            },
            deSelecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createStateError({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    } else if (!isSelected(item)) {
                        return createStateError({
                            reason: 'NOT_SELECTED',
                            data: get(item),
                            context,
                        });
                    } else {
                        return get(item);
                    }
                }
            }
        }

        function resolveInput (input) {
            if (Array.isArray(input)) {
                return input;
            }
            return typeof input === 'function' ? input : [input];
        }

        function splitByError (group, item) {
            if (!item) return group;
            if (item instanceof config.providers.Error) {
                group.errors = group.errors || [];
                group.errors.push(item);
            } else {
                group.items.push(item);
            }
            return group;
        }

        function resolveItemsWith (resolver, input, context) : { items: ItemType[], errors: ISelectorError<ItemType>[] } {
            const resolvedInput = resolveInput(input);
            const output = { items: [] };

            if (typeof resolvedInput !== 'function') {
                return resolvedInput
                    .reduce((out, item) => {
                        return splitByError(out, resolver.validate(item, context));
                    }, output);
            }
            
            const predicate = resolvedInput;

            if (resolver.iterator) {
                return resolver
                        .validate(resolver.iterator(this.state, predicate))
                        .reduce(splitByError, output);
            }

            return this.state.items.reduce((out, item, index) => {
                if (predicate(item, index) === true) {
                    return splitByError(out, resolver.validate(item, context));
                }
                return out;
            }, output);

        }

        function resolveKey (item) {
            const { trackBy } = config;

            if (!trackBy || (typeof item !== 'object' && item !== null)) {
                return item
            }
            if (typeof trackBy === 'function') {
                return trackBy(item);
            }
            return item[trackBy];
        }

        function isValidStateSchema (state) {
            if(!state) return false;
            return ([
                typeof state === 'object',
                Array.isArray(state.items),
                Array.isArray(state.selections)
            ]).every(condition => condition);
        }

        function createStateGetter (state, context) {
            const throwError = () => {
                return createStateError({
                    reason: 'INVALID_STATE',
                    context,
                    data: state
                }).print({ level: 'throw' });   
            }
                
            if (!state) {
                throwError();
            }

            if (Array.isArray(state)) {
                return {
                    get: () => ({ items: state, selections: [] })
                }
            }

            return { get: isValidStateSchema(state) ? () => state : throwError};
        }

        internals.set(this, {
            log,
            config,
            itemsMap,
            resolverFor,
            resolveInput,
            ifStrict,
            subscribers,
            selectionsMap,
            lastChange: undefined,
            resolveItemsWith: resolveItemsWith.bind(this), 
            createStateError: createStateError.bind(this),
            createStateGetter: createStateGetter.bind(this),
            has: has.bind(this),
            get: get.bind(this),
            isSelected: isSelected.bind(this),
            addTo: addTo.bind(this),
            removeFrom: removeFrom.bind(this),
            dispatch: dispatch.bind(this)
        });

        // kick it off!
        internals.get(this).initialStateGetter = createStateGetter.call(this, initialState, 'initialStateGetter');
        const { initialStateGetter } = internals.get(this);
        this.setState(initialStateGetter.get());
        
    }

    static mirror (change) {
        return {
            [ADDED]: (change[REMOVED] || []).slice(0),
            [REMOVED]: (change[ADDED] || []).slice(0),
            [SELECTED]: (change[DESELECTED] || []).slice(0),
            [DESELECTED]: (change[SELECTED] || []).slice(0),
        }
    }

    subscribe (
        successObserver : ISuccesObserver<ItemType, TrackByType>, 
        errorObserver? : IErrorObserver<ItemType,TrackByType>
    ) {
        const { subscribers } = internals.get(this);
        const observers = {
            success: successObserver,
            error: errorObserver || noop
        };
        subscribers.add(observers);
        return () => {
            subscribers.delete(observers);
            return this;
        };
    }

    select (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.bulk({
            [SELECTED]: input
        });
    }

    deSelect (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.bulk({
            [DESELECTED]: input
        });
    }

    selectAll () {
        return this.deSelectAll().select(this.state.items);
    }

    deSelectAll () {
        return this.deSelect(this.state.selections);
    }

    invert () {
        return this.toggle(this.state.items);
    }
    
    // TODO: refactor
    toggle (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        const changes = [input].reduce((acc, item) => {
            if (this.isSelected(item)) {
                acc[DESELECTED].push(item);
            } else {
                acc[SELECTED].push(item);
            }
            return acc;
        }, { [SELECTED]: [], [DESELECTED]: [] });
        return this.bulk(changes);
    }

    add (input: ItemType | ItemType[] | Function) {
        return this.bulk({
            [ADDED]: input
        });
    }
    
    remove (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.bulk({
            [REMOVED]: input
        });
    }

    removeAll () {
        return this.remove(this.state.items);
    }

    reset () {
        const { initialStateGetter } = internals.get(this);
        return this.setState(initialStateGetter.get());
    }

    isSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;

        const { items, errors } = resolveItemsWith(resolverFor.getting, input, 'isSelected');

        log(errors, 'warn');
        return items.every(isSelected);
    }

    isSomeSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { items, errors } = resolveItemsWith(resolverFor.getting, input, 'isSomeSelected');

        log(errors, 'warn');
        return items.some(isSelected);
    }

    isOnlySelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { items, errors } = resolveItemsWith(resolverFor.getting, input, 'isOnlySelected');

        log(errors, 'warn');
        return Boolean(items.length) && items.every(isSelected) 
                && this.state.selections.length === items.length;
               
    }

    has (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, has } = internals.get(this);
        const { items, errors } = resolveItemsWith(resolverFor.all, input);
        return Boolean(items.length) && items.every(has);
    }

    hasSome (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const { items, errors } = resolveItemsWith(resolverFor.getting, input);
        return Boolean(items.length);
    }

    // TODO: refactor
    swap (input, newItem) {
        const { dispatch, itemsMap, selectionsMap, resolveItemsWith, resolveKey } = internals.get(this);

        if (!this.has(input)) {
           throw new Error(`Selector#swap -> cannot swap non-existing item`);
        }

        const itemToReplace = resolveItemsWith(input)[0];
        const key = resolveKey(input);
        if (this.isSelected(itemToReplace)) {
            selectionsMap.set(key, newItem);
        }
        
        itemsMap.set(key, newItem);
        
        dispatch({
            [ADDED]:[itemsMap.get(key)],
            [REMOVED]: [itemToReplace]
        });

        return this;
    }

    setState (newState : ISelectorState<ItemType> | ItemType[]) {
        const { state } = this;
        const {
            log,
            removeFrom,
            addTo,
            resolveItemsWith,
            resolverFor,
            dispatch,
            itemsMap,
            ifStrict,
            selectionsMap,
            createStateGetter,
        } = internals.get(this);

        const validatedState = createStateGetter(newState, 'setState').get();

        const deSelected = removeFrom(selectionsMap, state.items);
        const removed = removeFrom(itemsMap, state.items);
        const added = addTo(itemsMap, validatedState.items);

        const { items, errors } = resolveItemsWith(resolverFor.selecting, validatedState.selections, 'selections@setState'); 
        const selected = ifStrict(errors) || addTo(selectionsMap, items);
  
        log(errors);
        dispatch({ deSelected, selected, removed, added });

        return this;
    }

    bulk (changes : ISelectorChangeInput<ItemType, TrackByType>) {
        const {
            log,
            addTo,
            removeFrom,
            resolveItemsWith,
            resolverFor,
            itemsMap,
            ifStrict,
            selectionsMap,
        } = internals.get(this);

        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];

        const validatedChanges = orderOfActions.reduce((change, action) => {
            if(!changes[action] && changes[action] !== 0) {
                return change;
            }
            const actions = {
                [REMOVED]: () => {
                    const { items, errors } = resolveItemsWith(resolverFor.getting, changes[REMOVED], REMOVED);
                    const result = ifStrict(errors) || removeFrom(itemsMap, items); 
         
                    items.forEach((item) => {
                        if (this.isSelected(item)) {
                            change[DESELECTED].push(...removeFrom(selectionsMap, [item]));
                        };
                    });


                    log(errors);
                    change[REMOVED] = result;
                },

                [DESELECTED]: () => {
                    const { items, errors } = resolveItemsWith(resolverFor.deSelecting, changes[DESELECTED], DESELECTED); 
                    const result = ifStrict(errors) || removeFrom(selectionsMap, items); 

                    log(errors);
                    change[DESELECTED].push(...result);
                 },

                [ADDED]: () => {
                    const { items, errors } = resolveItemsWith(resolverFor.adding, changes[ADDED], ADDED);
                    const result = ifStrict(errors) || addTo(itemsMap, items); 

                    log(errors);
                    change[ADDED] = result;
                 },

                [SELECTED]: () => {
                    const { items, errors } = resolveItemsWith(resolverFor.selecting, changes[SELECTED], SELECTED);
                    const result = ifStrict(errors) || addTo(selectionsMap, items);; 

                    log(errors);
                    change[SELECTED] = result;
                 }
            }

            actions[action]();
            return change;

        }, {
            [ADDED]: [],
            [SELECTED]: [],
            [DESELECTED]: [],
            [REMOVED]: []
        });

        const hasChanged = Object.keys(validatedChanges).some(action => !!validatedChanges[action].length);

        if (hasChanged) {
            dispatch(validatedChanges);
        }

        return this;
    }

    undoLast () {
        const { lastChange } = internals.get(this);
        this.bulk(Selector.mirror(lastChange));
    }

    unsubscribeAll () {
        const { subscribers } = internals.get(this);
        subscribers.clear();
        return this;
    }

    get state () : ISelectorState<ItemType> {
        const { selectionsMap, itemsMap } = internals.get(this);
        return {
            items: Array.from<ItemType>(itemsMap.values()),
            selections: Array.from<ItemType>(selectionsMap.values())
        }
    }

    get hasSelections () : boolean {
        const { selectionsMap } = internals.get(this);
        return Boolean(selectionsMap.size);
    }

    get hasItems () : boolean {
        const { itemsMap } = internals.get(this);
        return Boolean(itemsMap.size);
    }

    get isAllSelected () : boolean {
        return this.isSelected(this.state.items);
    }

    get isValid() : boolean {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state, this));
    }

}

export default Selector;
