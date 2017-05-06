import errors from './error-messages';
import {default as SelectorError, ISelectorError} from './selector-error';

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

export interface ISelectorState<T,P> {
    items: T[];
    selected: T[];
}

export interface ISelectorStateInput<T,P> {
    items: T[] | Function;
    selected: T[ ] | P[] | Function;
}

export interface ISelectorChange<T> {
    select? : T[];
    deselect? : T[];
    add? : T[];
    remove? : T[];
}

export interface ISelectorChangeInput<T,P> {
    select? : T[] | P[] | Function;
    deselect? : T[] | P[] | Function;
    add? : T[] | Function;
    remove? : T[] | P[] | Function;
}

export interface ISelector<T,P> extends Selector<T,P> {
    
}

export interface IObserver<T,P> {
    (changes: ISelectorChange<T>, state: ISelectorState<T,P>, selector: ISelector<T,P>): void;
}

export interface IErrorObserver<T,P> {
    (errors: any, state: ISelectorState<T,P>, selector: ISelector<T,P>): void;
}

const internals = new WeakMap();
const noop = () => {};
const ADD = 'add';
const REMOVE = 'remove';
const SELECT = 'select';
const DESELECT = 'deselect';

class Selector <ItemType = any, TrackByType = any> {
    constructor (initialState : ISelectorStateInput<ItemType, TrackByType> | ItemType[] = {
        items: [],
        selected: []
    }, settings : ISelectorSettings) {

        const itemsMap = new Map();
        const selectionsMap = new Map();
        const subscribers = {
            onChanges: new Set(),
            onErrors: new Set()
        };
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

        const createStateError = ({ reason, data, context = 'Selector' }) => {
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

        const dispatchChange = (changes : ISelectorChange<ItemType>) => {
             subscribers.onChanges.forEach((observer) => {
                observer(changes, this.state, this);
            });
        }

        const dispatchErrors = (errors: ISelectorError<ItemType>[]) => {
            subscribers.onErrors.forEach((observer) => {
                observer(errors, this.state, this);
            });
        }


        const dispatch = (
            status: { hasErrors: boolean, hasChanges: boolean },
            changes? : ISelectorChange<ItemType>,
            errors?: ISelectorError<ItemType>[]
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
            return itemsMap.get(resolveKey(item));
        } 

        const has = (item) => {
            return itemsMap.has(resolveKey(item));
        }

        const isSelected = (item) => {
            return selectionsMap.has(resolveKey(item));
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
                iterator(state, initialState, predicate) {
                    return predicate(state, initialState);
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
            deselecting: {
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

        const resolveItemsWith = (resolver, input, context) : { items: ItemType[], errors: ISelectorError<ItemType>[] } => {
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

        const isValidStateSchema = (state) => {
            if(!state) return false;
            return ([
                typeof state === 'object',
                (Array.isArray(state.items) || typeof state.items === 'function'),
                (Array.isArray(state.selected) || typeof state.selected === 'function')
            ]).every(condition => condition);
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
            resolveItemsWith, 
            createStateError,
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
        observer : IObserver<ItemType, TrackByType>, 
        errorObserver? : IErrorObserver<ItemType,TrackByType>
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

    select (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
            [SELECT]: input
        });
    }

    deselect (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
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
    
    toggle (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
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

    add (input: ItemType | ItemType[] | Function) {
        return this.applyChange({
            [ADD]: input
        });
    }
    
    remove (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
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

    isSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;

        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSelected');

        log(errors, 'warn');
        return hits.every(isSelected);
    }

    isSomeSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSomeSelected');

        log(errors, 'warn');
        return hits.some(isSelected);
    }

    isOnlySelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isOnlySelected');

        log(errors, 'warn');
        return !!hits.length && hits.every(isSelected) 
                && this.state.selected.length === hits.length;
               
    }

    has (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, has } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.all, input);
        return !!hits.length && hits.every(has);
    }

    hasSome (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input);
        return !!hits.length;
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
            [ADD]:[itemsMap.get(key)],
            [REMOVE]: [itemToReplace]
        });

        return this;
    }

    setState (newState : ISelectorStateInput<ItemType, TrackByType> | ItemType[]) {
        const { state } = this;
        const { createStateObject } = internals.get(this);
        const { items, selected } = createStateObject(newState)

        return this.applyChange({
            [REMOVE]: state.items,
            [ADD]: items,
            [SELECT]: selected
        });
    }

    applyChange (changes : ISelectorChangeInput<ItemType, TrackByType>) {
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

    get state () : ISelectorState<ItemType, TrackByType> {
        const { selectionsMap, itemsMap } = internals.get(this);
        return {
            items: Array.from<ItemType>(itemsMap.values()),
            selected: Array.from<ItemType>(selectionsMap.values())
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
