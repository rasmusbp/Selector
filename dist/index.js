(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.StatefulSelector = global.StatefulSelector || {})));
}(this, (function (exports) { 'use strict';

class Logger {
    constructor(message, ...args) {
        this.message = message;
        this.args = [...args];
    }
    print({ level }) {
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

var errors = {
    NO_ITEM: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    ALREADY_DESELECTED: context => `${context} --> item is already deselected.`,
    INVALID_TYPE: context => `${context} --> item must be of same type.`,
    INVALID_OBSERVER: () => `subscribe --> observer is not a function.`,
    INVALID_STATE: context => `${context} --> provided state is not valid. 
                    Make sure to provide valid 'items' and 'selections' arrays.`,
};

class SelectorError {
    constructor(message, item) {
        this.error = new Error(message);
        this.item = item;
    }
}

function flatten(arr) {
    return !Array.isArray(arr) ? [arr] : arr.reduce((acc, item) => [
        ...acc,
        ...flatten(item)
    ], []);
}
function logger({ err, details = undefined, strict = true, context = 'Selector', }) {
    const errFn = errors[err] || (() => 'null');
    return new Logger(`Selector@${errFn(context)}`, details);
}
function getChangeErrors(changes) {
    const errors$$1 = Object.keys(changes).reduce((errors$$1, action) => {
        return [...errors$$1, ...changes[action].filter(change => change instanceof SelectorError)];
    }, []);
    return errors$$1.length ? errors$$1 : undefined;
}
function has(item, internals) {
    const { itemsMap, resolveKey } = internals;
    return itemsMap.has(resolveKey(item));
}
function isSelected(items, internals) {
    const { selectionsMap, resolveKey } = internals;
    if (selectionsMap.size === 0)
        return false;
    return items.every(item => selectionsMap.has(resolveKey(item)));
}
function isSomeSelected(items, internals) {
    const { selectionsMap, resolveKey } = internals;
    if (selectionsMap.size === 0)
        return false;
    return items.some(item => selectionsMap.has(resolveKey(item)));
}
function addTo(map, items, internals) {
    const { resolveKey, config } = internals;
    return items.reduce((hits, item) => {
        if (item instanceof SelectorError) {
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
function removeFrom(map, items, internals) {
    const { resolveKey, config } = internals;
    return items.reduce((hits, item) => {
        if (item instanceof SelectorError) {
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
function dispatch(changes, state, internals) {
    const { subscriptions, noopChanges, config } = internals;
    const errors$$1 = config.strict && getChangeErrors(changes);
    subscriptions.forEach((observers) => {
        const args = [Object.assign(noopChanges, changes), state, this];
        if (errors$$1) {
            observers.error(errors$$1, ...args);
            return;
        }
        observers.success(...args);
    });
}
function resolveItems(input, context, internals) {
    const { itemsMap } = internals;
    if (typeof input === 'function') {
        const predicate = input;
        return this.state.items.reduce((hits, item, index) => {
            if (predicate(item, index) === true) {
                hits.push(item);
            }
            return hits;
        }, []);
    }
    const { resolveKey, config } = internals;
    const normalizedInput = flatten([input]);
    const filter = (inp) => {
        return inp.reduce((acc, item) => {
            const key = resolveKey(item);
            const hasItem = itemsMap.has(key);
            if (!hasItem && config.strict) {
                const log = logger({ err: 'NO_ITEM', context, details: item });
                log.print({ level: 'warn' });
                acc.push(new SelectorError(log.message, item));
            }
            else {
                acc.push(itemsMap.get(key));
            }
            return acc;
        }, []);
    };
    return filter(normalizedInput);
}
function resolveKey(item, internals) {
    const { trackBy } = internals.config;
    if (!trackBy || (typeof item !== 'object' && item !== null)) {
        return item;
    }
    if (typeof trackBy === 'function') {
        return trackBy(item);
    }
    return item[trackBy];
}
function createStateGetter(state, context) {
    if (!state) {
        logger({ err: 'INVALID_STATE', context }).print({ level: 'throw' });
    }
    if (Array.isArray(state)) {
        return {
            get: () => ({
                items: state,
                selections: []
            })
        };
    }
    const isCorrectSchema = () => ([
        typeof state === 'object',
        Array.isArray(state.items),
        Array.isArray(state.selections)
    ]).every(condition => condition);
    if (!isCorrectSchema()) {
        return {
            get: () => logger({ err: 'INVALID_STATE', context }).print({ level: 'throw' })
        };
    }
    return {
        get: () => state
    };
}

const privates = new WeakMap();
const ADDED = 'added';
const REMOVED = 'removed';
const SELECTED = 'selected';
const DESELECTED = 'deSelected';
class Selector$1 {
    constructor(initialState = {
            items: [],
            selections: []
        }, config = {}) {
        privates.set(this, {
            initialStateGetter: createStateGetter(initialState, 'initialStateGetter'),
            itemsMap: new Map(),
            selectionsMap: new Map(),
            subscriptions: new Set(),
            get noopChanges() {
                return {
                    [ADDED]: [],
                    [SELECTED]: [],
                    [DESELECTED]: [],
                    [REMOVED]: []
                };
            },
            createStateGetter: createStateGetter.bind(this),
            resolveItems: (items, context) => resolveItems(items, context, privates.get(this)),
            resolveKey: (item) => resolveKey(item, privates.get(this)),
            operators: {
                has: (item) => has(item, privates.get(this)),
                addTo: (map, items) => addTo(map, items, privates.get(this)),
                removeFrom: (map, items) => removeFrom(map, items, privates.get(this)),
                dispatch: (changes) => {
                    dispatch(changes, this.state, privates.get(this));
                },
                isSelected: (items) => isSelected(items, privates.get(this)),
                isSomeSelected: (items) => isSomeSelected(items, privates.get(this)),
            },
            config: Object.assign({
                trackBy: undefined,
                strict: true,
                validators: [() => true],
                serializer: input => input
            }, config),
        });
        // kick it all off!
        const { initialStateGetter } = privates.get(this);
        this.setState(initialStateGetter.get());
    }
    subscribe(successObserver, errorObserver) {
        const { subscriptions } = privates.get(this);
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
    select(input) {
        return this.patch({
            [SELECTED]: input
        });
    }
    deSelect(input) {
        return this.patch({
            [DESELECTED]: input
        });
    }
    selectAll(input) {
        return this.deSelectAll().select(this.state.items);
    }
    deSelectAll() {
        return this.deSelect(this.state.selections);
    }
    invert() {
        return this.toggle(this.state.items);
    }
    toggle(input) {
        const changes = flatten([input]).reduce((acc, item) => {
            if (this.isSelected(item)) {
                acc[DESELECTED].push(item);
            }
            else {
                acc[SELECTED].push(item);
            }
            return acc;
        }, { [SELECTED]: [], [DESELECTED]: [] });
        return this.patch(changes);
    }
    add(input) {
        return this.patch({
            [ADDED]: flatten([input])
        });
    }
    remove(input) {
        return this.patch({
            [REMOVED]: input
        });
    }
    removeAll() {
        return this.remove(this.state.items);
    }
    reset() {
        const { initialStateGetter } = privates.get(this);
        return this.setState(initialStateGetter.get());
    }
    isOnlySelected(input) {
        const { operators, resolveItems: resolveItems$$1 } = privates.get(this);
        const items = resolveItems$$1(input, 'isOnlySelected');
        return operators.isSelected(items)
            && this.state.selections.length === items.length;
    }
    isSelected(input) {
        const { operators, resolveItems: resolveItems$$1 } = privates.get(this);
        return operators.isSelected(resolveItems$$1(input, 'isSelected'));
    }
    isSomeSelected(input) {
        const { operators, resolveItems: resolveItems$$1 } = privates.get(this);
        return operators.isSomeSelected(resolveItems$$1(input, 'isSomeSelected'));
    }
    has(input) {
        const { operators, resolveItems: resolveItems$$1 } = privates.get(this);
        return operators.has(resolveItems$$1(input, 'has')[0]);
    }
    swap(input, newItem) {
        const { operators, itemsMap, selectionsMap, resolveItems: resolveItems$$1, resolveKey: resolveKey$$1 } = privates.get(this);
        if (!this.has(input)) {
            throw new Error(`Selector#swap -> cannot swap non-existing item`);
        }
        const itemToReplace = resolveItems$$1(input)[0];
        const key = resolveKey$$1(input);
        if (this.isSelected(itemToReplace)) {
            selectionsMap.set(key, newItem);
        }
        itemsMap.set(key, newItem);
        operators.dispatch({
            [ADDED]: [itemsMap.get(key)],
            [REMOVED]: [itemToReplace]
        });
        return this;
    }
    setState(newState) {
        const { state } = this;
        const { operators, resolveItems: resolveItems$$1, itemsMap, selectionsMap, createStateGetter: createStateGetter$$1, } = privates.get(this);
        const validatedState = createStateGetter$$1(newState, 'setState').get();
        const deSelected = operators.removeFrom(selectionsMap, state.items);
        const removed = operators.removeFrom(itemsMap, state.items);
        const added = operators.addTo(itemsMap, validatedState.items);
        const selected = operators.addTo(selectionsMap, resolveItems$$1(validatedState.selections, 'setState'));
        operators.dispatch({ deSelected, selected, removed, added });
        return this;
    }
    patch(appliedPatch) {
        const { operators, resolveItems: resolveItems$$1, itemsMap, selectionsMap, noopChanges, config, } = privates.get(this);
        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        const changes = Object.assign(noopChanges, appliedPatch);
        const logLevel = 'warn';
        const validatedChanges = orderOfActions.reduce((acc, action) => {
            switch (action) {
                case REMOVED:
                    acc[REMOVED] = operators.removeFrom(itemsMap, resolveItems$$1(changes[REMOVED], REMOVED));
                    break;
                case DESELECTED:
                    const deSelectedItems = resolveItems$$1(changes[DESELECTED], DESELECTED)
                        .map((item) => {
                        if (!config.strict || operators.isSelected([item]))
                            return item;
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
                        if (!config.strict || !operators.has(item))
                            return item;
                        return logger({
                            err: 'ALREADY_EXIST',
                            context: ADDED,
                            details: item
                        }).print({ level: logLevel });
                    });
                    acc[ADDED] = operators.addTo(itemsMap, newItems);
                    break;
                case SELECTED:
                    const selectedItems = resolveItems$$1(changes[SELECTED], SELECTED)
                        .map((item) => {
                        if (!config.strict || !operators.isSelected([item]))
                            return item;
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
    replay(patches) {
        patches.forEach(patch => this.patch(patch));
        return this;
    }
    unsubscribeAll() {
        const { subscriptions } = privates.get(this);
        subscriptions.clear();
        return this;
    }
    serialize(...args) {
        const { serializer } = privates.get(this).config;
        return serializer(this.state.selections, ...args);
    }
    get state() {
        const { selectionsMap, itemsMap } = privates.get(this);
        return {
            items: Array.from(itemsMap.values()),
            selections: Array.from(selectionsMap.values())
        };
    }
    get hasSelections() {
        const { selectionsMap } = privates.get(this);
        return Boolean(selectionsMap.size);
    }
    get isAllSelected() {
        return this.isSelected(this.state.items);
    }
    get isValid() {
        const { validators } = privates.get(this).config;
        return validators.every(validator => validator(this.state.selections));
    }
}

function createSelector(state, config = undefined) {
    return new Selector$1(state, config);
}

exports.createSelector = createSelector;
exports['default'] = Selector$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
