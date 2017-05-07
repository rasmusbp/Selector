/// <reference path="./selector.d.ts"/>
import errors from './error-messages';
import {default as StateError} from './state-error';

const internals = new WeakMap();
const noop = () => {};
const ADD = 'add';
const REMOVE = 'remove';
const SELECT = 'select';
const DESELECT = 'deselect';

class Selector <T = any, P = any> implements Slc.Selector<T,P> {
    constructor (initialState : Slc.StateInput<T, P> | T[] = {
        items: [],
        selected: []
    }, settings : Slc.Settings) {

        const itemsMap = new Map();
        const selectionsMap = new Map();
        const subscribers = {
            onChanges: new Set(),
            onErrors: new Set()
        };
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

        const addTo = (map, items) => {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                map.set(key, item);
                return [...hits, item];
            }, []);
        }

        const removeFrom = (map, items) => {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                const wasRemoved = map.delete(key);                
                return wasRemoved ? [...hits, item] : hits;
            }, []);
        }

        const dispatchChange = (changes : Slc.Change<T>) => {
            const readOnlyChanges : Slc.ReadOnlyChange<T> = {
                get add () { return changes[ADD] },
                get remove () { return changes[REMOVE] },
                get select () { return changes[SELECT] },
                get deselect () { return changes[DESELECT] },
            }
             subscribers.onChanges.forEach((observer) => {
                observer(readOnlyChanges, this.state, this);
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

        const get = (item) => itemsMap.get(resolveKey(item))
        const has = (item) => itemsMap.has(resolveKey(item))
        const isSelected = (item) => selectionsMap.has(resolveKey(item))

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
                iterator(state, initialState, predicate) {
                    return predicate(state, initialState);
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
                    return iterator(this.state, initialState, input);
                } else {
                    return this.state.items.reduce((acc, item, index) => {
                        if (input(item, index) === true) {
                            return [...acc, item];
                        }
                        return acc;
                    }, []);
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

        internals.set(this, {
            log,
            config,
            itemsMap,
            resolverFor,
            subscribers,
            selectionsMap,
            resolveInput,
            resolveKey,
            resolveItemsWith, 
            createError,
            createStateObject,
            has,
            get,
            isSelected,
            addTo,
            removeFrom,
            dispatch
        });

        // kick it off!
        this.setState(initialState);
        internals.get(this).initialState = this.state;
        
    }

    static mirror (change) {
        return {
            [ADD]: (change[REMOVE] || []).slice(0),
            [REMOVE]: (change[ADD] || []).slice(0),
            [SELECT]: (change[DESELECT] || []).slice(0),
            [DESELECT]: (change[SELECT] || []).slice(0),
        }
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

    selectAll () {
        return this.deselectAll().select(this.state.items);
    }

    deselectAll () {
        return this.deselect(this.state.selected);
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

    removeAll () {
        return this.remove(this.state.items);
    }

    reset () {
        const { initialState } = internals.get(this);
        return this.setState(initialState);
    }

    isSelected (input : T | T[] | P | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;

        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSelected');

        log(errors, 'warn');
        return hits.every(isSelected);
    }

    isSomeSelected (input : T[] | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSomeSelected');

        log(errors, 'warn');
        return hits.some(isSelected);
    }

    isOnlySelected (input : T | T[] | P | P[] | Slc.Predicate<T>) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isOnlySelected');

        log(errors, 'warn');
        return !!hits.length && hits.every(isSelected) 
                && this.state.selected.length === hits.length;
               
    }

    has (input : T | T[] | P | P[] | Slc.Iterator<T>) : boolean {
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
            itemsMap,
            dispatch,
            selectionsMap } = internals.get(this);


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
            itemsMap.set(key, newItem);
            if (wasSelected) {
                selectionsMap.set(key, newItem);
            }
        }

        dispatch({ hasChanges, hasErrors }, {
            [ADD]: [newItem],
            [SELECT]: wasSelected ? [newItem] : [],
            [DESELECT]: wasSelected ? [oldItem] : [],
            [REMOVE]: [oldItem]
        }, errors);

        return this;

    }

    setState (newState : Slc.StateInput<T, P> | T[]) {
        const { state } = this;
        const { createStateObject } = internals.get(this);
        const { items, selected } = createStateObject(newState)

        return this.applyChange({
            [REMOVE]: state.items,
            [ADD]: items,
            [SELECT]: selected
        });
    }

    applyChange (changes : Slc.ChangeInput<T, P>) {
        const {
            log,
            config,
            addTo,
            removeFrom,
            dispatch,
            resolveItemsWith,
            resolverFor,
            itemsMap,
            selectionsMap,
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

                    const change = !(acc.hasErrors && config.strict) ? removeFrom(itemsMap, hits) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    change.forEach((item) => {
                        if (this.isSelected(item)) {
                            acc.changes[DESELECT].push(...removeFrom(selectionsMap, [item]));
                        };
                    });

                    acc.changes[REMOVE] = change;
                },

                [ADD]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.adding, changes[ADD], ADD);
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;

                    const change = !(acc.hasErrors && config.strict) ? addTo(itemsMap, hits) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[ADD] = change;
                 },

                [DESELECT]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.deselecting, changes[DESELECT], DESELECT); 
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;
                    
                    const change = !(acc.hasErrors && config.strict) ? removeFrom(selectionsMap, hits) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[DESELECT].push(...change);
                 },

                [SELECT]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.selecting, changes[SELECT], SELECT);
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;

                    const change = !(acc.hasErrors && config.strict) ? addTo(selectionsMap, hits) : []; 
                    acc.hasChanges = acc.hasChanges || !!change.length;

                    acc.changes[SELECT] = change;
                 }
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

        const { hasChanges, hasErrors } = resolvedChanges;
        dispatch({ hasChanges, hasErrors }, resolvedChanges.changes, resolvedChanges.errors);
        
        return this;
    }

    get state () : Slc.State<T> {
        const { selectionsMap, itemsMap } = internals.get(this);
        return {
            items: Array.from<T>(itemsMap.values()),
            selected: Array.from<T>(selectionsMap.values())
        }
    }

    get hasSelections () : boolean {
        const { selectionsMap } = internals.get(this);
        return !!selectionsMap.size;
    }

    get hasItems () : boolean {
        const { itemsMap } = internals.get(this);
        return !!itemsMap.size;
    }

    get isAllSelected () : boolean {
        const { itemsMap, selectionsMap } = internals.get(this);
        return itemsMap.size === selectionsMap.size;
    }

    get isValid() : boolean {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state, this));
    }

}

export default Selector;
