(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.StatefulSelector = global.StatefulSelector || {})));
}(this, (function (exports) { 'use strict';

function flatten(arr) {
    return !Array.isArray(arr) ? [arr] : arr.reduce((acc, item) => [
        ...acc,
        ...flatten(item)
    ], []);
}

var errors = {
    NOT_EXIST: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    READ_ONLY: context => `${context} --> ${context} is a read only property`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    NOT_SELECTED: context => `${context} --> item is not selected.`,
    INVALID_TYPE: context => `${context} --> item must be of same type.`,
    INVALID_STATE: context => `${context} --> provided state is not valid. 
                    Make sure to provide valid 'items' and 'selections' arrays.`,
};

class SelectorError {
    constructor({ message, reason, data }) {
        this.message = message;
        this.reason = reason;
        this.data = data;
    }
    print(options) {
        switch (options.level) {
            case 'throw':
                throw new Error(this.message);
            case 'error':
                console.error(this.message, this.data);
                break;
            case 'warn':
                console.warn(this.message, this.data);
                break;
            case 'log':
                console.log(this.message, this.data);
                break;
            case 'silent':
                break;
            default:
                console.log(this.message, this.data);
                break;
        }
        return this;
    }
}

const internals = new WeakMap();
const ADDED = 'added';
const REMOVED = 'removed';
const SELECTED = 'selected';
const DESELECTED = 'deSelected';
class Selector {
    constructor(initialState = {
            items: [],
            selections: []
        }, settings) {
        const itemsMap = new Map();
        const selectionsMap = new Map();
        const subscriptions = new Set();
        const config = Object.assign({
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
        function getChangeErrors(changes) {
            const ErrorProvider = config.providers.Error;
            const errors$$1 = Object.keys(changes).reduce((errors$$1, action) => {
                return [...errors$$1, ...changes[action].filter(change => change instanceof ErrorProvider)];
            }, []);
            return errors$$1.length ? errors$$1 : undefined;
        }
        function addTo(map, resolved) {
            const errors$$1 = resolved.errors || [];
            if (config.strict && errors$$1.length) {
                return errors$$1;
            }
            return resolved.items.reduce((hits, item) => {
                const key = resolveKey(item);
                map.set(key, item);
                return [...hits, item];
            }, []);
        }
        function removeFrom(map, resolved) {
            const errors$$1 = resolved.errors || [];
            if (config.strict && errors$$1.length) {
                return errors$$1;
            }
            return resolved.items.reduce((hits, item) => {
                const key = resolveKey(item);
                const wasRemoved = map.delete(key);
                return wasRemoved ? [...hits, item] : hits;
            }, []);
        }
        function dispatch(changes) {
            const errors$$1 = config.strict && getChangeErrors(changes);
            subscriptions.forEach((observers) => {
                const args = [changes, this.state, this];
                if (errors$$1) {
                    observers.error(errors$$1, ...args);
                    return;
                }
                observers.success(...args);
            });
        }
        function get(item) {
            return itemsMap.get(resolveKey(item));
        }
        function has(item) {
            return itemsMap.has(resolveKey(item));
        }
        function isSelected(item) {
            return selectionsMap.has(resolveKey(item));
        }
        function log(errors$$1, level = config.logLevel) {
            if (config.strict || config.debug) {
                errors$$1.forEach(error => error.print({ level }));
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
                    }
                    else if (isSelected(item)) {
                        return createStateError({
                            reason: 'ALREADY_SELECTED',
                            data: get(item),
                            context,
                        });
                    }
                    else {
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
                    }
                    else if (!isSelected(item)) {
                        return createStateError({
                            reason: 'NOT_SELECTED',
                            data: get(item),
                            context,
                        });
                    }
                    else {
                        return get(item);
                    }
                }
            }
        };
        function resolveInput(input) {
            if (Array.isArray(input)) {
                return input;
            }
            return typeof input === 'function' ? input : [input];
        }
        function splitByError(group, item) {
            if (!item)
                return group;
            if (item instanceof config.providers.Error) {
                group.errors.push(item);
            }
            else {
                group.items.push(item);
            }
            return group;
        }
        function resolveItemsWith(resolver, input, context) {
            const resolvedInput = resolveInput(input);
            const output = { items: [], errors: [] };
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
        function resolveKey(item) {
            const { trackBy } = config;
            if (!trackBy || (typeof item !== 'object' && item !== null)) {
                return item;
            }
            if (typeof trackBy === 'function') {
                return trackBy(item);
            }
            return item[trackBy];
        }
        function isValidStateSchema(state) {
            if (!state)
                return false;
            return ([
                typeof state === 'object',
                Array.isArray(state.items),
                Array.isArray(state.selections)
            ]).every(condition => condition);
        }
        function createStateGetter(state, context) {
            const throwError = () => {
                return createStateError({
                    reason: 'INVALID_STATE',
                    context,
                    data: state
                }).print({ level: 'throw' });
            };
            if (!state) {
                throwError();
            }
            if (Array.isArray(state)) {
                return {
                    get: () => ({ items: state, selections: [] })
                };
            }
            return { get: isValidStateSchema(state) ? () => state : throwError };
        }
        internals.set(this, {
            log,
            config,
            itemsMap,
            resolverFor,
            resolveInput,
            subscriptions,
            selectionsMap,
            lastChange: undefined,
            resolveItemsWith: resolveItemsWith.bind(this),
            createStateError: createStateError.bind(this),
            createStateGetter: createStateGetter.bind(this),
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
    static mirror(change) {
        return {
            [ADDED]: (change[REMOVED] || []).slice(0),
            [REMOVED]: (change[ADDED] || []).slice(0),
            [SELECTED]: (change[DESELECTED] || []).slice(0),
            [DESELECTED]: (change[SELECTED] || []).slice(0),
        };
    }
    subscribe(successObserver, errorObserver) {
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
    select(input) {
        return this.bulk({
            [SELECTED]: input
        });
    }
    deSelect(input) {
        return this.bulk({
            [DESELECTED]: input
        });
    }
    selectAll() {
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
        return this.bulk(changes);
    }
    add(input) {
        return this.bulk({
            [ADDED]: input
        });
    }
    remove(input) {
        return this.bulk({
            [REMOVED]: input
        });
    }
    removeAll() {
        return this.remove(this.state.items);
    }
    reset() {
        const { initialStateGetter } = internals.get(this);
        return this.setState(initialStateGetter.get());
    }
    isSelected(input) {
        const { resolveItemsWith, resolverFor, operators, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const resolved = resolveItemsWith(resolverFor.getting, input, 'isSelected');
        log(resolved.errors, 'warn');
        return resolved.items.every(operators.isSelected);
    }
    isSomeSelected(input) {
        const { resolveItemsWith, resolverFor, operators, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const resolved = resolveItemsWith(resolverFor.getting, input, 'isSomeSelected');
        log(resolved.errors, 'warn');
        return resolved.items.some(operators.isSelected);
    }
    isOnlySelected(input) {
        const { resolveItemsWith, resolverFor, operators, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const resolved = resolveItemsWith(resolverFor.getting, input, 'isOnlySelected');
        log(resolved.errors, 'warn');
        return Boolean(resolved.items.length) && resolved.items.every(operators.isSelected)
            && this.state.selections.length === resolved.items.length;
    }
    has(input) {
        const { resolveItemsWith, resolverFor, operators } = internals.get(this);
        const resolved = resolveItemsWith(resolverFor.all, input);
        return Boolean(resolved.items.length) && resolved.items.every(operators.has);
    }
    hasSome(input) {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const resolved = resolveItemsWith(resolverFor.getting, input);
        return Boolean(resolved.items.length);
    }
    // TODO: refactor
    swap(input, newItem) {
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
            [ADDED]: [itemsMap.get(key)],
            [REMOVED]: [itemToReplace]
        });
        return this;
    }
    setState(newState) {
        const { state } = this;
        const { log, operators, resolveItemsWith, resolverFor, config, itemsMap, selectionsMap, createStateGetter, } = internals.get(this);
        const validatedState = createStateGetter(newState, 'setState').get();
        const deSelected = operators.removeFrom(selectionsMap, { items: state.items });
        const removed = operators.removeFrom(itemsMap, { items: state.items });
        const added = operators.addTo(itemsMap, { items: validatedState.items });
        const resolved = resolveItemsWith(resolverFor.selecting, validatedState.selections, 'selections@setState');
        log(resolved.errors);
        const selected = operators.addTo(selectionsMap, resolved);
        operators.dispatch({ deSelected, selected, removed, added });
        return this;
    }
    bulk(changes) {
        const { log, config, operators, resolveItemsWith, resolverFor, resolveInput, itemsMap, selectionsMap, } = internals.get(this);
        const orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        const validatedChanges = orderOfActions.reduce((change, action) => {
            if (!changes[action] && changes[action] !== 0) {
                return change;
            }
            const actions = {
                [REMOVED]: () => {
                    const resolved = resolveItemsWith(resolverFor.getting, changes[REMOVED], REMOVED);
                    log(resolved.errors);
                    resolved.items.forEach((item) => {
                        if (this.isSelected(item)) {
                            change[DESELECTED].push(...operators.removeFrom(selectionsMap, { items: [item] }));
                        }
                        
                    });
                    change[REMOVED] = operators.removeFrom(itemsMap, resolved);
                },
                [DESELECTED]: () => {
                    const resolved = resolveItemsWith(resolverFor.deSelecting, changes[DESELECTED], DESELECTED);
                    log(resolved.errors);
                    change[DESELECTED].push(...operators.removeFrom(selectionsMap, resolved));
                },
                [ADDED]: () => {
                    const resolved = resolveItemsWith(resolverFor.adding, changes[ADDED], ADDED);
                    log(resolved.errors);
                    change[ADDED] = operators.addTo(itemsMap, resolved);
                },
                [SELECTED]: () => {
                    const resolved = resolveItemsWith(resolverFor.selecting, changes[SELECTED], SELECTED);
                    log(resolved.errors);
                    change[SELECTED] = operators.addTo(selectionsMap, resolved);
                }
            };
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
            operators.dispatch(validatedChanges);
        }
        return this;
    }
    undoLast() {
        const { lastChange } = internals.get(this);
        this.bulk(Selector.mirror(lastChange));
    }
    unsubscribeAll() {
        const { subscriptions } = internals.get(this);
        subscriptions.clear();
        return this;
    }
    get state() {
        const { selectionsMap, itemsMap } = internals.get(this);
        return {
            items: Array.from(itemsMap.values()),
            selections: Array.from(selectionsMap.values())
        };
    }
    get hasSelections() {
        const { selectionsMap } = internals.get(this);
        return Boolean(selectionsMap.size);
    }
    get hasItems() {
        const { itemsMap } = internals.get(this);
        return Boolean(itemsMap.size);
    }
    get isAllSelected() {
        return this.isSelected(this.state.items);
    }
    get isValid() {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state, this));
    }
}

function createSelector(state, config = {}) {
    return new Selector(state, config);
}
const defaults = { createSelector, Selector };

exports['default'] = defaults;
exports.createSelector = createSelector;
exports.Selector = Selector;

Object.defineProperty(exports, '__esModule', { value: true });

})));
