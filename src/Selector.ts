import flatten from './flatten';
import errors from './error-messages';
import SelectorError from './selector-error';

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
    serializer?: Function;
    providers?: ISelectorProviders;
}

export interface ISelectorPatch<T> {
    selected? : T[];
    deSelected? : T[];
    added? : T[];
    removed? : T[];
}

export interface ISelectorPatchInput<T,P> {
    selected? : T[]|P[]|Function;
    deSelected? : T[]|P[]|Function;
    added? : T[];
    removed? : T[]|P[]|Function;
}

export interface ISelector<T,P> extends Selector<T,P> {
    
}

export interface ISuccesObserver<T,P> {
    (changes: ISelectorPatch<T>, state: ISelectorState<T>, selector: ISelector<T,P>): void;
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
    }, config : ISelectorConfig) {

        function createStateError({ reason, data, context = 'Selector' }) {
            const errFn = errors[reason] || (() => 'null');
            const { config } = internals.get(this);
            const ErrorProvider = config.providers.Error;
            return new ErrorProvider({
                message: `Selector@${errFn(context)}`,
                reason,
                data
            });
        }

        function getChangeErrors (changes) {
            const { resolveKey, config } = internals.get(this);
            const ErrorProvider = config.providers.Error;
            const errors = Object.keys(changes).reduce((errors, action) => {
                return [...errors, ...changes[action].filter(change => change instanceof ErrorProvider)];
            }, []);
            return errors.length ? errors : undefined;
        }

        function addTo (map, items) {
            const { resolveKey, config } = internals.get(this);
            const ErrorProvider = config.providers.Error;
            return items.reduce((hits, item) => {
                if (item instanceof ErrorProvider) {
                    hits.push(item);
                    return hits;
                }

                const key = resolveKey(item);
                const hasItem = !map.has(key);
                if (hasItem) {
                    map.set(key, item);
                    hits.push(item);
                }
                return hits;
            }, []);
        }

        function removeFrom (map, items) {
            const { resolveKey, config } = internals.get(this);
            const ErrorProvider = config.providers.Error;
            return items.reduce((hits, item) => {
                if (item instanceof ErrorProvider) {
                    hits.push(item);
                    return hits;
                }

                const key = resolveKey(item);
                const wasRemoved = map.delete(key);
                if (wasRemoved) {
                    hits.push(item);
                }
                
                return hits;
            }, []);
        }

        function dispatch (changes, state) {
            const { subscriptions, noopChange } = internals.get(this);
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

        function resolveItems (input, context) : ItemType[] {
            const { itemsMap } = internals.get(this);

            if (typeof input === 'function') {
                const predicate = input;
                return this.state.items.reduce((hits, item, index) => {
                    if (predicate(item, index) === true) {
                        hits.push(item);
                    }
                    return hits;
                }, []);
            }

            const { resolveKey, config } = internals.get(this);
            const normalizedInput = flatten([input]);
            const validate = (inp: any[]) => {
                return inp.reduce((acc, item) => {
                    const key = resolveKey(item);
                    const hasItem = itemsMap.has(key);
                    if (!hasItem && config.strict && context) {
                        const err = createStateError.call(this, { reason: 'NOT_EXIST', context, data: item });
                        acc.push(err.print({ level: 'warn' }));
                    } else {
                        acc.push(itemsMap.get(key));
                    }
                    return acc;
                }, []);
            };

            return validate(normalizedInput);
        }

        function resolveKey (item) {
            const { trackBy } = internals.get(this).config;

            if (!trackBy || (typeof item !== 'object' && item !== null)) {
                return item
            }
            if (typeof trackBy === 'function') {
                return trackBy(item);
            }
            return item[trackBy];
        }

        function isValidStateSchema(state) {
            if(!state) return false;
            return ([
                typeof state === 'object',
                Array.isArray(state.items),
                Array.isArray(state.selections)
            ]).every(condition => condition);
        }

        function createStateGetter (state, context) {
            const throwError = () => {
                return createStateError.call(this, {
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
            itemsMap: new Map(),
            selectionsMap: new Map(),
            subscriptions: new Set(),
            get noopChange () {
                return {
                    [ADDED]: [],
                    [SELECTED]: [],
                    [DESELECTED]: [],
                    [REMOVED]: []
                }
            },
            createStateGetter: createStateGetter.bind(this),
            createStateError: createStateError.bind(this),
            resolveItems: resolveItems.bind(this), 
            resolveKey: resolveKey.bind(this),
            operators: {
                addTo: addTo.bind(this),
                removeFrom: removeFrom.bind(this),
                dispatch: dispatch.bind(this)
            },
            config: Object.assign({
                trackBy: undefined,
                strict: true,
                validators: [() => true],
                serializer: input => input,
                providers: Object.assign({
                    Error: SelectorError
                }, config.providers)
            }, config)
        });

        // kick it off!
        internals.get(this).initialStateGetter = createStateGetter.call(this, initialState, 'initialStateGetter');
        const { initialStateGetter } = internals.get(this);
        this.setState(initialStateGetter.get());
        
    }

    static mirror (patch) {
        return {
            [ADDED]: (patch[REMOVED] || []).slice(0),
            [REMOVED]: (patch[ADDED] || []).slice(0),
            [SELECTED]: (patch[DESELECTED] || []).slice(0),
            [DESELECTED]: (patch[SELECTED] || []).slice(0),
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
            [SELECTED]: typeof input === 'function' ? input : flatten([input]) 
        });
    }

    deSelect (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
            [DESELECTED]: typeof input === 'function' ? input : flatten([input]) 
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

    toggle (input) {
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

    add (input: ItemType | ItemType[]) {
        return this.applyChange({
            [ADDED]: flatten([input])
        });
    }

    remove (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) {
        return this.applyChange({
            [REMOVED]: typeof input === 'function' ? input : flatten([input]) 
        });
    }

    removeAll () {
        return this.remove(this.state.items);
    }

    reset () {
        const { initialStateGetter } = internals.get(this);
        return this.setState(initialStateGetter.get());
    }

    isOnlySelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { resolveItems } = internals.get(this);
        const items = resolveItems(input, 'isOnlySelected');
        return this.isSelected(input) 
                && this.state.selections.length === items.length;
    }

    isSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { selectionsMap, resolveItems, resolveKey } = internals.get(this);
        if (selectionsMap.size === 0) return false;
        return resolveItems(input, 'isSelected')
                .every(item => selectionsMap.has(resolveKey(item)));
    }

    isSomeSelected (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { selectionsMap, resolveKey, resolveItems } = internals.get(this);
        if (selectionsMap.size === 0) return false;
        return resolveItems(input, 'isSomeSelected')
                .some(item => selectionsMap.has(resolveKey(item)));
    }

    has (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { itemsMap, resolveItems, resolveKey } = internals.get(this);
        const items = resolveItems(input);
        if (!items.length) return false;
        return items.every(item => itemsMap.has(resolveKey(item)));
    }

    hasSome (input : ItemType | ItemType[] | TrackByType | TrackByType[] | Function) : boolean {
        const { itemsMap, resolveItems, resolveKey } = internals.get(this);
        const items = resolveItems(input);
        if (!items.length) return false;
        return items.some(item => itemsMap.has(resolveKey(item)));
    }

    swap (input, newItem) {
        const { operators, itemsMap, selectionsMap, resolveItems, resolveKey } = internals.get(this);

        if (!this.has(input)) {
           throw new Error(`Selector#swap -> cannot swap non-existing item`);
        }

        const itemToReplace = resolveItems(input)[0];
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
            resolveItems,
            itemsMap,
            selectionsMap,
            createStateGetter,
        } = internals.get(this);

        const validatedState = createStateGetter(newState, 'setState').get();

        const deSelected = operators.removeFrom(selectionsMap, state.items);
        const removed = operators.removeFrom(itemsMap, state.items);
        const added = operators.addTo(itemsMap, validatedState.items);
        const selected = operators.addTo(selectionsMap, resolveItems(validatedState.selections, 'setState'));
  
        operators.dispatch({ deSelected, selected, removed, added });

        return this;
    }

    applyChange (appliedChange : ISelectorPatchInput<ItemType, TrackByType>) {
        const {
            operators,
            resolveItems,
            itemsMap,
            selectionsMap,
            noopChange,
            config,
            createStateError
        } = internals.get(this);

        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        const changes = Object.assign(noopChange, appliedChange);
        
        const logLevel = 'warn';

        const validatedChanges = orderOfActions.reduce((acc, action) => {
            switch (action) {
                case REMOVED:
                    const removedItems = resolveItems(changes[REMOVED], REMOVED)
                        .reduce((hits, item) => {
                            let acc = hits;
                            if (this.has([item])) {
                                acc = [...hits, item]
                            } else if (config.strict) {
                                const err = createStateError({ reason: 'NOT_EXIST', context: REMOVED, data: item });
                                acc = [...hits, err.print({ level: logLevel })];
                            }
                            if (this.isSelected([item])) {
                                operators.removeFrom(selectionsMap, [item]);
                            };
                            return acc;
                        }, []);
                    acc[REMOVED] = operators.removeFrom(itemsMap, removedItems);
                    break;

                case DESELECTED:
                    const deSelectedItems = resolveItems(changes[DESELECTED], DESELECTED)
                        .reduce((hits, item) => {
                            if (this.isSelected([item])) return [...hits, item];
                            if (!config.strict) return hits;
                            const err = createStateError({ reason: 'ALREADY_DESELECTED', context: DESELECTED, data: item });
                            return [...hits, err.print({ level: logLevel })];
                        }, []);
                    acc[DESELECTED] = operators.removeFrom(selectionsMap, deSelectedItems);
                    break;

                case ADDED:
                    const newItems = changes[ADDED]
                        .map((item) => {
                            if (!config.strict || !this.has(item)) return item;
                            const err = createStateError({ reason: 'ALREADY_EXIST', context: ADDED, data: item });
                            return err.print({ level: logLevel })
                        });

                    acc[ADDED] = operators.addTo(itemsMap, newItems);
                    break;

                case SELECTED:
                    const selectedItems = resolveItems(changes[SELECTED], SELECTED)
                        .map((item) => {
                            if (!config.strict || !operators.isSelected([item])) return item;
                            const err = createStateError({ reason: 'ALREADY_SELECTED', context: SELECTED, data: item });
                            return err.print({ level: logLevel })
                        });

                    acc[SELECTED] = operators.addTo(selectionsMap, selectedItems);
                    break;

                default:
                    break;
            }

            return acc;

        }, {});

        // TODO: add more strict check
        const hasChanged = Object.keys(validatedChanges).some(action => validatedChanges[action].length);

        if (hasChanged) {
            operators.dispatch(validatedChanges);
        }

        return this;
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
