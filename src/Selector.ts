import flatten from './flatten';
import errors from './error-messages';
import {default as SelectorError, ISelectorError, ILogOptions} from './selector-error';

export interface ISelectorState<T> {
    items: T[];
    selections: any[];
}

export interface ISelectorProviders {
    Error: any;
}

export interface ISelectorConfig {
    trackBy?: string;
    strict?: boolean;
    validators?: Function[];
    logLevel?: 'throw' | 'error' | 'warn' | 'log' | 'silent';
    serializer?: Function;
    providers?: ISelectorProviders;
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

const ADDED = 'added';
const REMOVED = 'removed';
const SELECTED = 'selected';
const DESELECTED = 'deSelected';

class Selector <ItemType = any, TrackByType = any> {
    constructor (initialState : ISelectorState<ItemType> | ItemType[] = {
        items: [],
        selections: []
    }, configuratons : ISelectorConfig) {


        const itemsMap = new Map();
        const selectionsMap = new Map();
        const subscriptions = new Set();
        const config = Object.assign({
            trackBy: undefined,
            strict: true,
            validators: [() => true],
            serializer: input => input,
            logLevel: 'warn',
            providers: Object.assign({
                Error: SelectorError
            }, configuratons.providers)
        }, configuratons, {
            get noopChange () {
                return {
                    [ADDED]: [],
                    [SELECTED]: [],
                    [DESELECTED]: [],
                    [REMOVED]: []
                } 
            }
        });

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

        function addTo (map, resolved) {
            const ErrorProvider = config.providers.Error;
            const errors = resolved.errors || [];
            return [...resolved.items, ...errors].reduce((hits, item) => {
                if (item instanceof ErrorProvider) {
                    return [...hits, item];
                }
                const key = resolveKey(item);
                map.set(key, item);
                return [...hits, item];
            }, []);
        }

        function removeFrom (map, resolved) {
            const ErrorProvider = config.providers.Error;
            const errors = resolved.errors || [];
            return [...resolved.items, ...errors].reduce((hits, item) => {
                if (item instanceof ErrorProvider) {
                    return [...hits, item];
                }
                const key = resolveKey(item);
                const wasRemoved = map.delete(key);                
                return wasRemoved ? [...hits, item] : hits;
            }, []);
        }

        function dispatch (changes, state) {
            const errors = config.strict && getChangeErrors(changes);
            subscriptions.forEach((observers) => {
                const args = [changes, state, this];
                if (errors) {
                    observers.error(errors, ...args);
                    return;
                }
                observers.success(...args);
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


        const resolverFor = {
            all: {
                validate: item => item
            },
            existing: {
                validate: get
            },
            addingItems: {
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
            gettingItems: {
                validate(item, context) {
                    return has(item) ? get(item) : createStateError({
                        reason: 'NOT_EXIST',
                        data: item,
                        context,
                    });
                }
            },
            selectingItems: {
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
            deSelectingItems: {
                validate(item, context) {
                    if (!has(item)) {
                        return createStateError({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    } else if (!isSelected(item)) {
                        return createStateError({
                            reason: 'ALREADY_DESELECTED',
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
                group.errors.push(item);
            } else {
                group.items.push(item);
            }
            return group;
        }

        function resolveItemsWith (resolver, input, context) : { items: ItemType[], errors: ISelectorError<ItemType>[] } {
            const resolvedInput = resolveInput(input);
            const output = { items: [], errors: [] };

            if (typeof resolvedInput !== 'function') {
                return resolvedInput
                    .reduce((out, item) => {
                        return splitByError(out, resolver.validate(item, context));
                    }, output);
            }
            
            const predicate = resolvedInput;
            let iterator = (state, predicate) => {
                return this.state.items.reduce((out, item, index) => {
                    if (predicate(item, index) === true) {
                        return splitByError(out, resolver.validate(item, context));
                    }
                    return out;
                }, output);
            };

            if (resolver.iterator) {
                iterator = (state, predicate) => {
                    return resolver
                            .validate(resolver.iterator(state, predicate))
                            .reduce(splitByError, output);
                }
            }

            return iterator(this.state, predicate);

            
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
            config,
            itemsMap,
            subscriptions,
            selectionsMap,
            resolveInput,
            resolverFor,
            createStateGetter: createStateGetter.bind(this),
            createStateError: createStateError.bind(this),
            resolveItemsWith: resolveItemsWith.bind(this), 
            resolveKey: resolveKey.bind(this),
            lastChange: undefined,
            operators: {
                has: has.bind(this),
                get: get.bind(this),
                isSelected: isSelected.bind(this),
                addTo: addTo.bind(this),
                removeFrom: removeFrom.bind(this),
                dispatch: dispatch.bind(this)
            },
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
        const { subscriptions } = internals.get(this);
        const observers = {
            success: successObserver,
            error: errorObserver
        };
        subscriptions.add(observers);
        return () => {
            subscriptions.delete(observers);
            return this;
        };
    }

    select (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
            [SELECTED]: input
        });
    }

    deSelect (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
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
    
    toggle (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        const changes = flatten([input]).reduce((acc, item) => {
            if (this.isSelected(item)) {
                acc[DESELECTED].push(item);
            } else {
                acc[SELECTED].push(item);
            }
            return acc;
        }, { [SELECTED]: [], [DESELECTED]: [] });
        return this.applyChange(changes);
    }

    add (input: ItemType | ItemType[] | Function) {
        return this.applyChange({
            [ADDED]: input
        });
    }
    
    remove (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
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
        const { resolveItemsWith, resolverFor, operators, config } = internals.get(this);
        if (!this.hasSelections) return false;

        const resolved = resolveItemsWith(resolverFor.gettingItems, input, 'isSelected');
        if (config.strict) {
            resolved.errors.forEach(error => error.print({ level: config.logLevel }))
        }
        return resolved.items.every(operators.isSelected);
    }

    isSomeSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, operators, config } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const resolved = resolveItemsWith(resolverFor.gettingItems, input, 'isSomeSelected');
        if (config.strict) {
            resolved.errors.forEach(error => error.print({ level: config.logLevel }))
        }
        return resolved.items.some(operators.isSelected);
    }

    isOnlySelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, operators, config } = internals.get(this);
        if (!this.hasSelections) return false;
        
        const resolved = resolveItemsWith(resolverFor.gettingItems, input, 'isOnlySelected');
        if (config.strict) {
            resolved.errors.forEach(error => error.print({ level: config.logLevel }))
        }
        return Boolean(resolved.items.length) && resolved.items.every(operators.isSelected) 
                && this.state.selections.length === resolved.items.length;
               
    }

    has (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor, operators } = internals.get(this);
        const resolved = resolveItemsWith(resolverFor.all, input);
        return Boolean(resolved.items.length) && resolved.items.every(operators.has);
    }

    hasSome (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const resolved = resolveItemsWith(resolverFor.gettingItems, input);
        return Boolean(resolved.items.length);
    }

    // TODO: refactor
    swap (input, newItem) {
        const { operators, itemsMap, selectionsMap, resolveItemsWith, resolveKey } = internals.get(this);

        if (!this.has(input)) {
           throw new Error(`Selector#swap -> cannot swap non-existing item`);
        }

        const itemToReplace = resolveItemsWith(input)[0];
        const key = resolveKey(input);
        if (this.isSelected(itemToReplace)) {
            selectionsMap.set(key, newItem);
        }
        
        itemsMap.set(key, newItem);
        
        operators.dispatch({
            [ADDED]:[itemsMap.get(key)],
            [REMOVED]: [itemToReplace]
        });

        return this;
    }

    setState (newState : ISelectorState<ItemType> | ItemType[]) {
        const { state } = this;
        const {
            operators,
            resolveItemsWith,
            resolverFor,
            config,
            itemsMap,
            selectionsMap,
            createStateGetter,
        } = internals.get(this);

        const validatedState = createStateGetter(newState, 'setState').get();

        const deSelected = operators.removeFrom(selectionsMap, { items: state.items });
        const removed = operators.removeFrom(itemsMap, { items: state.items });
        const added = operators.addTo(itemsMap, { items: validatedState.items });

        const resolved = resolveItemsWith(resolverFor.selectingItems, validatedState.selections, 'setState');
         if (config.strict) {
            resolved.errors.forEach(error => error.print({ level: config.logLevel }))
        }
        const selected = operators.addTo(selectionsMap, resolved);
  
        operators.dispatch({ deSelected, selected, removed, added });

        return this;
    }

    applyChange (appliedChange : ISelectorChangeInput<ItemType, TrackByType>) {
        const {
            operators,
            resolveItemsWith,
            resolverFor,
            resolveInput,
            itemsMap,
            selectionsMap,
            noopChange,
            config,
            createStateError
        } = internals.get(this);

        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        const changes = Object.assign(config.noopChange, appliedChange);
        
        const logLevel = 'warn';

        const validatedChanges = orderOfActions.reduce((acc, action) => {
            const actions = {
                [REMOVED]: () => {
                    const resolved = resolveItemsWith(resolverFor.gettingItems, changes[REMOVED], REMOVED);
                    if (config.strict) {
                        resolved.errors.forEach(error => error.print({ level: config.logLevel }))
                    }
                    resolved.items.forEach((item) => {
                        if (this.isSelected(item)) {
                            acc[DESELECTED].push(operators.removeFrom(selectionsMap, resolved));
                        };
                    });
                    acc[REMOVED] = operators.removeFrom(itemsMap, resolved);
                },

                [DESELECTED]: () => {
                    const resolved = resolveItemsWith(resolverFor.deSelectingItems, changes[DESELECTED], DESELECTED); 
                    if (config.strict) {
                        resolved.errors.forEach(error => error.print({ level: config.logLevel }))
                    }
                    acc[DESELECTED].push(operators.removeFrom(selectionsMap, resolved));
                 },

                [ADDED]: () => {
                    const resolved = resolveItemsWith(resolverFor.addingItems, changes[ADDED], ADDED); 
                    if (config.strict) {
                        resolved.errors.forEach(error => error.print({ level: config.logLevel }))
                    }
                    acc[ADDED] = operators.addTo(itemsMap, resolved);
                 },

                [SELECTED]: () => {
                    const resolved = resolveItemsWith(resolverFor.selectingItems, changes[SELECTED], SELECTED); 
                    if (config.strict) {
                        resolved.errors.forEach(error => error.print({ level: config.logLevel }))
                    }
                    acc[SELECTED] = operators.addTo(selectionsMap, resolved);
                 }
            }

            actions[action]();
            return acc;

        }, config.noopChange);

        // TODO: add more strict check
        const hasChanged = Object.keys(validatedChanges).some(action => validatedChanges[action].length);

        if (hasChanged) {
            operators.dispatch(validatedChanges);
        }

        return this;
    }

    undoLast () {
        const { lastChange } = internals.get(this);
        this.applyChange(Selector.mirror(lastChange));
    }

    unsubscribeAll () {
        const { subscriptions } = internals.get(this);
        subscriptions.clear();
        return this;
    }

    serialize (...args) {
        const { serializer } = internals.get(this).config;
        return serializer(this.state.selections, ...args);
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

    get isAllSelected () : boolean {
        return this.isSelected(this.state.items);
    }

    get isValid() : boolean {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state.selections));
    }

}

export default Selector;
