/// <reference path="./selector.d.ts"/>
import errors from './error-messages';
import {default as StateError} from './state-error';

const internals = new WeakMap();
const noop = () => {};
const ADD = 'add';
const REMOVE = 'remove';
const SELECT = 'select';
const DESELECT = 'deselect';

class Selector <T,P> implements Slc.Selector<T,P> {
    constructor (initialState : Slc.StateLike<T,P> | T[] = {
        items: [],
        selected: []
    }, settings : Slc.Settings) {

        const stateMap = new Map();
        const subscribers = {
            onChanges: new Set(),
            onErrors: new Set()
        };
        const currentState : Slc.State<T> = { items: [], selected: [] };
        const config : Slc.Config = Object.assign({
            trackBy: undefined,
            strict: false,
            debug: false,
            validators: [() => true],
            providers: Object.assign({
                Error: StateError
            }, settings.providers)
        }, settings);

        config.logLevel = config.strict ? 'error' : 'warn';

        const createError = ({ reason, data, context = 'Selector' }) : Slc.StateError<T> => {
            const errFn = errors[reason] || (() => 'null');
            const ErrorProvider = config.providers.Error;
            return new ErrorProvider({
                message: `Selector@${errFn(context)}`,
                reason,
                data
            });
        }
    
        const dispatchChange = (changes : Slc.Change<T>) => {
            subscribers.onChanges.forEach((observer) => {
                observer(changes, this.state, this);
            });
        }

        const dispatchErrors = (errors: Slc.StateError<T>[]) => {
            subscribers.onErrors.forEach((observer) => {
                observer(errors, this.state, this);
            });
        }

        const dispatch = (
            status: { hasErrors: boolean, hasChanges: boolean },
            changes? : Slc.Change<T>,
            errors?: Slc.StateError<T>[]
        ) => {    
            if (status.hasErrors) {
                dispatchErrors(errors);
                if (config.strict) return;
            }
            if (status.hasChanges) {
                dispatchChange(changes);
            }
        }

        const get = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && !current.filtered ? current.value : undefined
        };
        const has = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && current !== 0 && !current.filtered;
        };
        const isSelected = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && current !== 0 && current.selected && !current.filtered;
        }

        const addToStateMap = (items, state) => {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                const current = stateMap.get(key); 
                if (current) {
                    Object.assign(current, state);
                    return [...hits, current.value];
                } else {
                    stateMap.set(key, { value: item, ...state });
                    return [...hits, item];
                }
            }, []);
        }

        const removeFromStateMap = (items) => {
            return items.map(item => {
                stateMap.delete(resolveKey(item));
                return item;
            });
        }

        const log = (errors, level = config.logLevel) => {
            if (errors.length && (config.strict || config.debug)) {
                errors.forEach(error => error.print({ level }))
            }
        }

        const resolverFor = {
            all: {
                validate: item => item
            },
            existing: {
                validate: get
            },
            adding: {
                iterator(initialState, predicate) {
                    return predicate(getCurrentState(), initialState);
                },
                validate(item, context) {
                    if (has(item)) {
                        return createError({
                            reason: 'ALREADY_EXIST',
                            data: item,
                            context,
                        });
                    } else {
                        return item;
                    }
                    
                }
            },
            getting: {
                validate(item, context) {
                    return has(item) ? get(item) : createError({
                        reason: 'NOT_EXIST',
                        data: item,
                        context,
                    });
                }
            },
            selecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createError({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    } else if (isSelected(item)) {
                        return createError({
                            reason: 'ALREADY_SELECTED',
                            data: get(item),
                            context,
                        })
                    } else {
                        return get(item);
                    }
                }
            },
            deselecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createError({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    } else if (!isSelected(item)) {
                        return createError({
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

        const resolveInput = (input, iterator?) => {
            if (typeof input === 'function') {
                if (iterator) {
                    const { initialState } = internals.get(this)
                    return iterator(initialState, input);
                } else {
                    const acc = [];
                    for (let [key, item] of stateMap) {
                        if (item.filtered) continue;
                        if (input(item) === true) {
                            acc.push(item.value);
                        }
                    }
                    return acc;
                }
            } else if (Array.isArray(input)) {
                return input;
            } else {
                return [input];
            }
        }

        const groupByType = (group, item) => {
            if (!item) return group;
            if (item instanceof config.providers.Error) {
                group.errors.push(item);
            } else {
                group.hits.push(item);
            }
            return group;
        }

        const resolveItemsWith = (resolver, input, context) : { items: T[], errors: Slc.StateError<T>[] } => {
            const resolvedInput = resolveInput(input, resolver.iterator);
            const output = { hits: [], errors: [] };

            return resolvedInput
                    .reduce((out, item) => {
                        return groupByType(out, resolver.validate(item, context));
                    }, output);
        }

        const resolveKey = (item) => {
            const { trackBy } = config;

            if (!trackBy || (typeof item !== 'object' && item !== null)) {
                return item
            }
            if (typeof trackBy === 'function') {
                return trackBy(item);
            }
            return item[trackBy];
        }

        const createStateObject = (input) => {
            if (Array.isArray(input)) {
                return {
                    items: input.slice(), 
                    selected: []
                }
            }
            
            return {
                items: Array.isArray(input.items) ? input.items.slice() : input.items, 
                selected: Array.isArray(input.selected) ? input.selected.slice() : input.selected
            };
        }

        function getCurrentState () {
            return Array.from<Slc.ItemState<T>>(stateMap.values()).reduce((state, item) => {
                if (item.filtered) return state;
                if (item.selected) {
                    state.selected.push(item.value);
                }
                state.items.push(item.value);
                return state;
            }, { items: [], selected: []});
        }

        function setCurrentState () {
            const newState = getCurrentState();
            currentState.items = newState.items;
            currentState.selected = newState.selected;
        }

        internals.set(this, {
            log,
            config,
            resolverFor,
            subscribers,
            resolveInput,
            resolveKey,
            resolveItemsWith, 
            createError,
            createStateObject,
            currentState,
            setCurrentState,
            stateMap,
            has,
            get,
            addToStateMap,
            removeFromStateMap,
            isSelected,
            dispatch
        });

        // kick it off!
        this.setState(initialState);
        internals.get(this).initialState = this.state;
        
    }

    revert (change : Slc.Change<T>) {
        return this.applyChange({
            [ADD]: change[REMOVE],
            [REMOVE]: change[ADD],
            [SELECT]: change[DESELECT],
            [DESELECT]: change[SELECT],
        });
    }

    subscribe (
        observer : Slc.Observer<T, P>, 
        errorObserver? : Slc.ErrorObserver<T,P>
    ) {
        const { subscribers } = internals.get(this);
        const { onChanges, onErrors } = subscribers;

        onChanges.add(observer);
        if (errorObserver) {
            onErrors.add(errorObserver);
        }
        return () => {
            onChanges.delete(observer);
            onErrors.delete(errorObserver);
            return this;
        };
    }

    select (input : T | T[] | P | P[] | Slc.Predicate<T>) {
        return this.applyChange({
            [SELECT]: input
        });
    }

    deselect (input : T | T[] | P | P[] | Slc.Predicate<T>) {
        return this.applyChange({
            [DESELECT]: input
        });
    }

    invert () {
        return this.toggle(this.state.items);
    }
    
    toggle (input : T | T[] | P | P[] | Slc.Predicate<T>) {
        const { resolveInput, isSelected } = internals.get(this);
        const hits = resolveInput(input);
        const changes = hits.reduce((acc, item) => {
            if (isSelected(item)) {
                acc[DESELECT].push(item);
            } else {
                acc[SELECT].push(item);
            }
            return acc;
        }, { [SELECT]: [], [DESELECT]: [] });

        return this.applyChange(changes);
    }

    add (input: T | T[] | Slc.Iterator<T>) {
        return this.applyChange({
            [ADD]: input
        });
    }
    
    remove (input : T | T[] | P | P[] | Slc.Predicate<T>) {
        return this.applyChange({
            [REMOVE]: input
        });
    }

    reset () {
        const { initialState } = internals.get(this);
        return this.setState(initialState);
    }

    filter (predicate: Slc.Predicate<T>) {
        const { stateMap } = internals.get(this);

        const change = {
            [ADD]: [],
            [REMOVE]: []
        }

        stateMap.forEach((item, index) => {
            const input = { value: item.value, selected: item.selected };
            const result = predicate(input);
            if (result === true) {
                item.filtered = false;
                change[ADD].push(item.value);
            }
            if (result === false) {
                item.filtered = true;
                change[REMOVE].push(item.value);
            }
        });

        return this.applyChange(change);
    }


    some (predicate : Slc.Predicate<T>) {
        const { stateMap } = internals.get(this);
        let someTrue = false;
        for (let [key, item] of stateMap) {
            if (item.filtered) continue;
            const input = { value: item.value, selected: item.selected };
            if (predicate(input) === true) {
                someTrue = true;
                break;
            }
        }

        return someTrue;
    }

    every (predicate : Slc.Predicate<T>) {
        const { stateMap } = internals.get(this);
        let allTrue = true;
        for (let [key, item] of stateMap) {
            if (item.filtered) continue;
            const input = { value: item.value, selected: item.selected };
            if (predicate(input) !== true) {
                allTrue = false;
                break;
            }
        }
        return allTrue;
    }

    isSelected (input : T | T[] | P | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSelected');

        log(errors, 'warn');
        return hits.every(isSelected);
    }

    has (input : T | T[] | P | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor, has } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.all, input);
        return !!hits.length && hits.every(has);
    }

    hasSome (input : T[] | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input);
        return !!hits.length;
    }
    
    swap (input : T | P | Slc.Predicate<T>, newItem : T) {
        const { 
            config,
            log,
            createError,
            resolveItemsWith,
            resolverFor,
            resolveKey,
            isSelected,
            setCurrentState,
            stateMap,
            dispatch } = internals.get(this);

        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'swapping');

        let hasErrors = false;
        if (errors.length) {
            hasErrors = true;
            log(errors);
        }

        const oldItem = hits[0];
        const key = resolveKey(oldItem);
        const wasSelected = isSelected(oldItem)

        let hasChanges = false;
        if (!hasErrors) {
            hasChanges = true;
            stateMap.set(key, {
                value: newItem,
                selected: wasSelected
            });
        }

        setCurrentState();

        dispatch({ hasChanges, hasErrors }, {
            [ADD]: [newItem],
            [SELECT]: wasSelected ? [newItem] : [],
            [DESELECT]: wasSelected ? [oldItem] : [],
            [REMOVE]: [oldItem]
        }, errors);

        return this;

    }

    setState (newState : Slc.StateLike<T,P> | T[]) {
        const { createStateObject, currentState } = internals.get(this);
        const { items, selected } = createStateObject(newState)
       
        return this.applyChange({
            [REMOVE]: currentState.items,
            [ADD]: items,
            [SELECT]: selected
        });
    }

    applyChange (changes : Slc.ChangeLike<T, P>) {
        const {
            log,
            addToStateMap,
            removeFromStateMap,
            config,
            dispatch,
            resolveItemsWith,
            resolverFor,
            setCurrentState
        } = internals.get(this);

        const orderOfActions = [REMOVE, ADD, DESELECT, SELECT];

        const resolvedChanges = orderOfActions.reduce((acc, action) => {
            if(!changes[action] && changes[action] !== 0) {
                return acc;
            }
            const actions = {
                [REMOVE]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.getting, changes[REMOVE], REMOVE);
          
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;

                    const change = !(acc.hasErrors && config.strict) ? removeFromStateMap(hits) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;
                
                    change.forEach((item) => {
                        if (this.isSelected(item)) {
                            acc.changes[DESELECT].push(item);
                        };
                    });

                    acc.changes[REMOVE] = change;
                },

                [ADD]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.adding, changes[ADD], ADD);

                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;

                    const change = !(acc.hasErrors && config.strict) ? addToStateMap(hits) : []; 
                                       
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[ADD] = change;
                 },

                 [DESELECT]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.deselecting, changes[DESELECT], DESELECT); 
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;
                    
                    const change = !(acc.hasErrors && config.strict) ? addToStateMap(hits, { selected: false }) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[DESELECT].push(...change);
                 },

                [SELECT]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.selecting, changes[SELECT], SELECT);
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;
                    
                    const change = !(acc.hasErrors && config.strict) ? addToStateMap(hits, { selected: true }) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[SELECT] = change;
                 },
            }

            actions[action]();
            return acc;

        }, {
            hasChanges: false,
            hasErrors: false,
            changes: {
                [ADD]: [],
                [SELECT]: [],
                [DESELECT]: [],
                [REMOVE]: []
            },
            errors: []
        });

        setCurrentState();

        const { hasChanges, hasErrors } = resolvedChanges;
        dispatch({ hasChanges, hasErrors }, resolvedChanges.changes, resolvedChanges.errors);
        
        return this;
    }

    get state () : Slc.State<T> {
        const { currentState } = internals.get(this);
        return {
            items: currentState.items.slice(0),
            selected: currentState.selected.slice(0)
        }
    }

    get isValid() : boolean {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state, this));
    }

}

export default Selector;
