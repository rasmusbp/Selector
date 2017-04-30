import flatten from './flatten';
import {
    logger,
    createStateGetter,
    resolveItems, 
    resolveKey,
    addTo,
    removeFrom,
    dispatch,
} from './utils';

const internals = new WeakMap();

const ADDED = 'added';
const REMOVED = 'removed';
const SELECTED = 'selected';
const DESELECTED = 'deSelected';

export interface ISelectorState<T> {
    items: T[];
    selections: any[];
}

export interface ISelectorConfig {
    trackBy?: string;
    strict?: boolean;
    validator?: Function[];
    serializer?: Function;
}

export interface ISelectorPatch<T> {
    selected? : T[];
    deSelected? : T[];
    added? : T[];
    removed? : T[];
}

export interface ISelector extends Selector {
}

export interface ISuccesObserver<T> {
    (changes: ISelectorPatch<T>, state: ISelectorState<T>, selector: ISelector): void;
}

export interface IErrorObserver<T> {
    (errors: any, state: ISelectorState<T>, selector: ISelector): void;
}

class Selector <ItemType = any, TrackByType = any> {
    constructor (initialState : ISelectorState<ItemType> | any[] = {
        items: [],
        selections: []
    }, config : ISelectorConfig = {}) {

        internals.set(this, {
            initialStateGetter: createStateGetter(initialState, 'initialStateGetter'),
            itemsMap: new Map(),
            selectionsMap: new Map(),
            subscriptions: new Set(),
            get noopChanges () {
                return {
                    [ADDED]: [],
                    [SELECTED]: [],
                    [DESELECTED]: [],
                    [REMOVED]: []
                }
            },
            createStateGetter: createStateGetter.bind(this),
            resolveItems: (items, context) => resolveItems<ItemType>(items, context, internals.get(this)), 
            resolveKey: (item) => resolveKey(item, internals.get(this)),
            operators: {
                addTo: (map, items) => addTo(map, items, internals.get(this)),
                removeFrom: (map, items) => removeFrom(map, items, internals.get(this)),
                dispatch: (changes : ISelectorPatch<ItemType>) => {
                     dispatch(changes, this.state, internals.get(this))
                }
            },
            config: Object.assign({
                trackBy: undefined,
                strict: true,
                validators: [() => true],
                serializer: input => input
            }, config),
        });

        // kick it all off!
        const { initialStateGetter } = internals.get(this);
        this.setState(initialStateGetter.get());
    }

    subscribe (successObserver : ISuccesObserver<ItemType>, errorObserver? : IErrorObserver<ItemType>) {
        const { subscriptions } = internals.get(this);
        if ((!successObserver || typeof successObserver !== 'function') || 
            (errorObserver && typeof errorObserver !== 'function')) {
            logger({ err: 'INVALID_OBSERVER' }).print({ level: 'throw' });
        }
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

    select (input: ItemType | ItemType[] | TrackByType | TrackByType[]) {
        return this.patch({
            [SELECTED]: input
        });
    }

    deSelect (input: ItemType | ItemType[] | TrackByType | TrackByType[]) {
        return this.patch({
            [DESELECTED]: input 
        });
    }

    selectAll (input) {
        return this.deSelectAll().select(this.state.items);
    }

    deSelectAll () {
        return this.deSelect(this.state.selections);
    }

    invert () {
        return this.toggle(this.state.items);
    }

    toggle (input: ItemType | ItemType[] | TrackByType | TrackByType[]) {
        const changes = flatten([input]).reduce((acc, item) => {
            if (this.isSelected(item)) {
                acc[DESELECTED].push(item);
            } else {
                acc[SELECTED].push(item);
            }
            return acc;
        }, { [SELECTED]: [], [DESELECTED]: [] });
        return this.patch(changes);
    }

    add (input: ItemType | ItemType[]) {
        return this.patch({
            [ADDED]: flatten([input])
        });
    }

    remove (input: ItemType | ItemType[] | TrackByType | TrackByType[]) {
        return this.patch({
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

    isOnlySelected (input: ItemType | ItemType[] | TrackByType | TrackByType[]) : boolean {
        const { resolveItems } = internals.get(this);
        const items = resolveItems(input, 'isOnlySelected');
        return this.isSelected(input) 
                && this.state.selections.length === items.length;
    }

    isSelected (input: ItemType | ItemType[] | TrackByType | TrackByType[]) : boolean {
        const { selectionsMap, resolveItems, resolveKey } = internals.get(this);
        if (selectionsMap.size === 0) return false;
        return resolveItems(input, 'isSelected')
                .every(item => selectionsMap.has(resolveKey(item)));
    }

    isSomeSelected (input: ItemType | ItemType[] | TrackByType | TrackByType[]) : boolean {
        const { selectionsMap, resolveKey, resolveItems } = internals.get(this);
        if (selectionsMap.size === 0) return false;
        return resolveItems(input, 'isSomeSelected')
                .some(item => selectionsMap.has(resolveKey(item)));
    }

    has (input) : boolean {
        const { itemsMap, resolveItems, resolveKey } = internals.get(this);
        const items = resolveItems(input, 'has');
        return items.every(item => itemsMap.has(resolveKey(item)));
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

    setState (newState : ISelectorState<ItemType>) {
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

    patch (appliedPatch : ISelectorPatch<ItemType>) {
        const {
            operators,
            resolveItems,
            itemsMap,
            selectionsMap,
            noopChanges,
            config,
        } = internals.get(this);

        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        const changes = Object.assign(noopChanges, appliedPatch);
        
        const logLevel = 'warn';

        const validatedChanges = orderOfActions.reduce((acc, action) => {
            switch (action) {
                case REMOVED:
                    acc[REMOVED] = operators.removeFrom(itemsMap, resolveItems(changes[REMOVED], REMOVED));
                    break;

                case DESELECTED:
                    const deSelectedItems = resolveItems(changes[DESELECTED], DESELECTED)
                        .map((item) => {
                            if (!config.strict || operators.isSelected([item])) return item;
                            return logger({
                                err: 'ALREADY_DESELECTED',
                                context: DESELECTED,
                                details: item
                            }).print({ level: logLevel });
                        });
                    acc[DESELECTED] = operators.removeFrom(selectionsMap, deSelectedItems);
                    break;

                case ADDED:
                    const newItems = changes[ADDED]
                        .map((item) => {
                            if (!config.strict || !operators.has(item)) return item;
                            return logger({
                                err: 'ALREADY_EXIST',
                                context: ADDED,
                                details: item
                            }).print({ level: logLevel })
                        });

                    acc[ADDED] = operators.addTo(itemsMap, newItems);
                    break;

                case SELECTED:
                    const selectedItems = resolveItems(changes[SELECTED], SELECTED)
                        .map((item) => {
                            if (!config.strict || !operators.isSelected([item])) return item;
                            return logger({
                                err: 'ALREADY_SELECTED',
                                context: SELECTED,
                                details: item
                            }).print({ level: logLevel });
                        });

                    acc[SELECTED] = operators.addTo(selectionsMap, selectedItems);
                    break;

                default:
                    break;
            }

            return acc;

        }, {});

        const hasChanged = Object.keys(validatedChanges).some(action => validatedChanges[action].length);

        if (hasChanged) {
            operators.dispatch(validatedChanges);
        }

       
        return this;
    }

    replay (patches) {
        patches.forEach(patch => this.patch(patch));
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
