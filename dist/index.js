(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.StatefulSelector = global.StatefulSelector || {})));
}(this, (function (exports) { 'use strict';

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
const ADD = 'add';
const REMOVE = 'remove';
const SELECT = 'select';
const DESELECT = 'deselect';
class Selector {
    constructor(initialState = {
            items: [],
            selected: []
        }, settings) {
        const itemsMap = new Map();
        const selectedMap = new Map();
        const subscribers = {
            onChanges: new Set(),
            onErrors: new Set()
        };
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
        const createStateError = ({ reason, data, context = 'Selector' }) => {
            const errFn = errors[reason] || (() => 'null');
            const ErrorProvider = config.providers.Error;
            return new ErrorProvider({
                message: `Selector@${errFn(context)}`,
                reason,
                data
            });
        };
        const addTo = (map, items) => {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                map.set(key, item);
                return [...hits, item];
            }, []);
        };
        const removeFrom = (map, items) => {
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                const wasRemoved = map.delete(key);
                return wasRemoved ? [...hits, item] : hits;
            }, []);
        };
        const dispatchChange = (changes) => {
            subscribers.onChanges.forEach((observer) => {
                observer(changes, this.state, this);
            });
        };
        const dispatchErrors = (errors$$1) => {
            subscribers.onErrors.forEach((observer) => {
                observer(errors$$1, this.state, this);
            });
        };
        const dispatch = (status, changes, errors$$1) => {
            if (status.hasErrors) {
                dispatchErrors(errors$$1);
                if (config.strict)
                    return;
            }
            if (status.hasChanges) {
                dispatchChange(changes);
            }
        };
        const get = (item) => {
            return itemsMap.get(resolveKey(item));
        };
        const has = (item) => {
            return itemsMap.has(resolveKey(item));
        };
        const isSelected = (item) => {
            return selectedMap.has(resolveKey(item));
        };
        const log = (errors$$1, level = config.logLevel) => {
            if (errors$$1.length && (config.strict || config.debug)) {
                errors$$1.forEach(error => error.print({ level }));
            }
        };
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
        const resolveInput = (input, iterator) => {
            if (typeof input === 'function') {
                if (iterator) {
                    return iterator(this.state, input);
                }
                else {
                    return this.state.items.reduce((acc, item, index) => {
                        if (input(item, index) === true) {
                            return [...acc, item];
                        }
                        return acc;
                    }, []);
                }
            }
            else if (Array.isArray(input)) {
                return input;
            }
            else {
                return [input];
            }
        };
        const groupByType = (group, item) => {
            if (!item)
                return group;
            if (item instanceof config.providers.Error) {
                group.errors.push(item);
            }
            else {
                group.hits.push(item);
            }
            return group;
        };
        const resolveItemsWith = (resolver, input, context) => {
            const resolvedInput = resolveInput.call(this, input, resolver.iterator);
            const output = { hits: [], errors: [] };
            return resolvedInput
                .reduce((out, item) => {
                return groupByType(out, resolver.validate(item, context));
            }, output);
        };
        const resolveKey = (item) => {
            const { trackBy } = config;
            if (!trackBy || (typeof item !== 'object' && item !== null)) {
                return item;
            }
            if (typeof trackBy === 'function') {
                return trackBy(item);
            }
            return item[trackBy];
        };
        const isValidStateSchema = (state) => {
            if (!state)
                return false;
            return ([
                typeof state === 'object',
                Array.isArray(state.items),
                Array.isArray(state.selected)
            ]).every(condition => condition);
        };
        const createStateGetter = (state, context) => {
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
                    get: () => ({ items: state.slice(), selected: [] })
                };
            }
            return { get: isValidStateSchema(state) ? () => state : throwError };
        };
        internals.set(this, {
            log,
            config,
            itemsMap,
            resolverFor,
            subscribers,
            selectedMap,
            resolveInput,
            resolveItemsWith,
            createStateError,
            createStateGetter,
            has,
            get,
            isSelected,
            addTo,
            removeFrom,
            dispatch
        });
        // kick it off!
        this.setState(createStateGetter(initialState, 'initialState').get());
        internals.get(this).initialState = this.state;
    }
    static mirror(change) {
        return {
            [ADD]: (change[REMOVE] || []).slice(0),
            [REMOVE]: (change[ADD] || []).slice(0),
            [SELECT]: (change[DESELECT] || []).slice(0),
            [DESELECT]: (change[SELECT] || []).slice(0),
        };
    }
    subscribe(observer, errorObserver) {
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
    select(input) {
        return this.applyChange({
            [SELECT]: input
        });
    }
    deSelect(input) {
        return this.applyChange({
            [DESELECT]: input
        });
    }
    selectAll() {
        return this.deSelectAll().select(this.state.items);
    }
    deSelectAll() {
        return this.deSelect(this.state.selected);
    }
    invert() {
        return this.toggle(this.state.items);
    }
    toggle(input) {
        const { resolveInput, isSelected } = internals.get(this);
        const hits = resolveInput(input);
        const changes = hits.reduce((acc, item) => {
            if (isSelected(item)) {
                acc[DESELECT].push(item);
            }
            else {
                acc[SELECT].push(item);
            }
            return acc;
        }, { [SELECT]: [], [DESELECT]: [] });
        return this.applyChange(changes);
    }
    add(input) {
        return this.applyChange({
            [ADD]: input
        });
    }
    remove(input) {
        return this.applyChange({
            [REMOVE]: input
        });
    }
    removeAll() {
        return this.remove(this.state.items);
    }
    reset() {
        const { initialState } = internals.get(this);
        return this.setState(initialState);
    }
    isSelected(input) {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.getting, input, 'isSelected');
        log(errors$$1, 'warn');
        return hits.every(isSelected);
    }
    isSomeSelected(input) {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.getting, input, 'isSomeSelected');
        log(errors$$1, 'warn');
        return hits.some(isSelected);
    }
    isOnlySelected(input) {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        if (!this.hasSelections)
            return false;
        const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.getting, input, 'isOnlySelected');
        log(errors$$1, 'warn');
        return !!hits.length && hits.every(isSelected)
            && this.state.selected.length === hits.length;
    }
    has(input) {
        const { resolveItemsWith, resolverFor, has } = internals.get(this);
        const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.all, input);
        return !!hits.length && hits.every(has);
    }
    hasSome(input) {
        const { resolveItemsWith, resolverFor } = internals.get(this);
        const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.getting, input);
        return !!hits.length;
    }
    // TODO: refactor
    swap(input, newItem) {
        const { dispatch, itemsMap, selectedMap, resolveItemsWith, resolveKey } = internals.get(this);
        if (!this.has(input)) {
            throw new Error(`Selector#swap -> cannot swap non-existing item`);
        }
        const itemToReplace = resolveItemsWith(input)[0];
        const key = resolveKey(input);
        if (this.isSelected(itemToReplace)) {
            selectedMap.set(key, newItem);
        }
        itemsMap.set(key, newItem);
        dispatch({
            [ADD]: [itemsMap.get(key)],
            [REMOVE]: [itemToReplace]
        });
        return this;
    }
    setState(newState) {
        const { state } = this;
        const { items, selected } = newState;
        return this.applyChange({
            [REMOVE]: state.items,
            [ADD]: items,
            [SELECT]: selected
        });
    }
    applyChange(changes) {
        const { log, config, addTo, removeFrom, dispatch, resolveItemsWith, resolverFor, itemsMap, selectedMap, } = internals.get(this);
        const orderOfActions = [REMOVE, ADD, DESELECT, SELECT];
        const resolvedChanges = orderOfActions.reduce((acc, action) => {
            if (!changes[action] && changes[action] !== 0) {
                return acc;
            }
            const actions = {
                [REMOVE]: () => {
                    const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.getting, changes[REMOVE], REMOVE);
                    log(errors$$1);
                    acc.errors.push(...errors$$1);
                    acc.hasErrors = acc.hasErrors || !!errors$$1.length;
                    const change = !(acc.hasErrors && config.strict) ? removeFrom(itemsMap, hits) : [];
                    acc.hasChanges = acc.hasChanges || !!change.length;
                    change.forEach((item) => {
                        if (this.isSelected(item)) {
                            acc.changes[DESELECT].push(...removeFrom(selectedMap, [item]));
                        }
                        
                    });
                    acc.changes[REMOVE] = change;
                },
                [ADD]: () => {
                    const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.adding, changes[ADD], ADD);
                    log(errors$$1);
                    acc.errors.push(...errors$$1);
                    acc.hasErrors = acc.hasErrors || !!errors$$1.length;
                    const change = !(acc.hasErrors && config.strict) ? addTo(itemsMap, hits) : [];
                    acc.hasChanges = acc.hasChanges || !!change.length;
                    acc.changes[ADD] = change;
                },
                [DESELECT]: () => {
                    const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.deSelecting, changes[DESELECT], DESELECT);
                    log(errors$$1);
                    acc.errors.push(...errors$$1);
                    acc.hasErrors = acc.hasErrors || !!errors$$1.length;
                    const change = !(acc.hasErrors && config.strict) ? removeFrom(selectedMap, hits) : [];
                    acc.hasChanges = acc.hasChanges || !!change.length;
                    acc.changes[DESELECT].push(...change);
                },
                [SELECT]: () => {
                    const { hits, errors: errors$$1 } = resolveItemsWith(resolverFor.selecting, changes[SELECT], SELECT);
                    log(errors$$1);
                    acc.errors.push(...errors$$1);
                    acc.hasErrors = acc.hasErrors || !!errors$$1.length;
                    const change = !(acc.hasErrors && config.strict) ? addTo(selectedMap, hits) : [];
                    acc.hasChanges = acc.hasChanges || !!change.length;
                    acc.changes[SELECT] = change;
                }
            };
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
    get state() {
        const { selectedMap, itemsMap } = internals.get(this);
        return {
            items: Array.from(itemsMap.values()),
            selected: Array.from(selectedMap.values())
        };
    }
    get hasSelections() {
        const { selectedMap } = internals.get(this);
        return Boolean(selectedMap.size);
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
const selector = createSelector([1, 2, 3, 4]);
selector.select([2, 3]);
console.log(selector.state);
selector.toggle((item) => {
    return item === 2 || item === 4;
});
console.log(selector.state);

exports['default'] = defaults;
exports.createSelector = createSelector;
exports.Selector = Selector;

Object.defineProperty(exports, '__esModule', { value: true });

})));
