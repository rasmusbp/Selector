(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.StatefulSelector = global.StatefulSelector || {})));
}(this, (function (exports) { 'use strict';

var logMessages = {
    NOT_EXIST: context => `${context} --> item does not exist.`,
    ALREADY_EXIST: context => `${context} --> item already exist.`,
    READ_ONLY: context => `${context} --> ${context} is a read only property`,
    ALREADY_SELECTED: context => `${context} --> item is already selected.`,
    NOT_SELECTED: context => `${context} --> item is not selected.`,
    NO_TRACKBY: context => `${context} --> action only works in track-by mode.`,
    INVALID_TRACKBY_ITEM: context => `${context} --> item(s) must be objects in track-by mode.`,
    CHANGE: () => `[ √ ] --> a potential change to current state has been applied.`
};

class StateLog {
    constructor({ message, reason, data }) {
        Object.defineProperties(this, {
            message: {
                get: () => message
            },
            reason: {
                get: () => reason
            },
            data: {
                get: () => data
            },
        });
    }
    print(options = { level: '' }) {
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

/// <reference path="./selector.d.ts"/>
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
        const stateMap = new Map();
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
                Log: StateLog
            }, settings.providers)
        }, settings);
        config.logLevel = config.strict ? 'error' : 'warn';
        const createLog = ({ reason, data, context = 'Selector' }) => {
            const logFn = logMessages[reason] || (() => 'null');
            const LogProvider = config.providers.Log;
            return new LogProvider({
                message: `Selector@${logFn(context)}`,
                reason,
                data
            });
        };
        const dispatchChange = (changes) => {
            subscribers.onChanges.forEach((observer) => {
                observer(this.state, changes, this);
            });
        };
        const dispatchErrors = (errors) => {
            subscribers.onErrors.forEach((observer) => {
                observer(errors, this.state, this);
            });
        };
        const dispatch = (meta, changes, errors) => {
            if (meta.hasErrors) {
                dispatchErrors(errors);
                if (config.strict)
                    return;
            }
            if (meta.hasChanges) {
                dispatchChange(changes);
                if (config.debug) {
                    createLog({
                        reason: 'CHANGE',
                        data: {
                            errors,
                            changes,
                            state: this.state
                        },
                        context: 'change'
                    }).print({ level: 'log' });
                }
            }
        };
        const get = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && !current.filtered ? current.value : undefined;
        };
        const has = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && current !== 0 && !current.filtered;
        };
        const isSelected = (item) => {
            const current = stateMap.get(resolveKey(item));
            return current && current !== 0 && current.selected && !current.filtered;
        };
        const addToStateMap = (items, state) => {
            const { trackBy } = config;
            return items.reduce((hits, item) => {
                const key = resolveKey(item);
                const current = stateMap.get(key);
                if (current) {
                    Object.assign(current, state);
                    return [...hits, current.value];
                }
                else {
                    const update = Object.assign({ value: item }, state);
                    if (trackBy) {
                        update.key = key;
                    }
                    stateMap.set(key, update);
                    return [...hits, item];
                }
            }, []);
        };
        const removeFromStateMap = (items) => {
            return items.map(item => {
                stateMap.delete(resolveKey(item));
                return item;
            });
        };
        const getPredicateArgs = (item) => {
            const args = {
                value: item.value,
                selected: item.selected
            };
            if (item.key) {
                args.key = item.key;
            }
            return args;
        };
        const log = (errors, level = config.logLevel) => {
            if (errors.length && (config.strict || config.debug)) {
                errors.forEach(error => error.print({ level }));
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
                iterator(state, initialState, predicate) {
                    return predicate(state, initialState);
                },
                validate(item, context) {
                    if (has(item)) {
                        return createLog({
                            reason: 'ALREADY_EXIST',
                            data: item,
                            context,
                        });
                    }
                    else {
                        return item;
                    }
                }
            },
            getting: {
                validate(item, context) {
                    return has(item) ? get(item) : createLog({
                        reason: 'NOT_EXIST',
                        data: item,
                        context,
                    });
                }
            },
            selecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createLog({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    }
                    else if (isSelected(item)) {
                        return createLog({
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
            deselecting: {
                validate(item, context) {
                    if (!has(item)) {
                        return createLog({
                            reason: 'NOT_EXIST',
                            data: item,
                            context,
                        });
                    }
                    else if (!isSelected(item)) {
                        return createLog({
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
                    const { initialState } = internals.get(this);
                    return iterator(this.state, initialState, input);
                }
                else {
                    const acc = [];
                    for (let [key, item] of stateMap) {
                        if (item.filtered)
                            continue;
                        if (input(item) === true) {
                            acc.push(item.value);
                        }
                    }
                    return acc;
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
            if (item instanceof config.providers.Log) {
                group.errors.push(item);
            }
            else {
                group.hits.push(item);
            }
            return group;
        };
        const resolveItemsWith = (resolver, input, context) => {
            const resolvedInput = resolveInput(input, resolver.iterator);
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
        const createStateObject = (input) => {
            if (Array.isArray(input)) {
                return {
                    items: input.slice(),
                    selected: []
                };
            }
            return {
                items: Array.isArray(input.items) ? input.items.slice(0) : input.items,
                selected: Array.isArray(input.selected) ? input.selected.slice(0) : input.selected
            };
        };
        const getCurrentState = () => {
            return Array.from(stateMap.values()).reduce((state, item) => {
                if (item.filtered)
                    return state;
                if (item.selected) {
                    state.selected.push(item.value);
                }
                state.items.push(item.value);
                return state;
            }, { items: [], selected: [] });
        };
        const updateCurrentState = () => {
            internals.get(this).currentState = getCurrentState();
        };
        internals.set(this, {
            log,
            config,
            resolverFor,
            subscribers,
            resolveInput,
            resolveKey,
            resolveItemsWith,
            createLog,
            createStateObject,
            getPredicateArgs,
            stateMap,
            has,
            get,
            addToStateMap,
            removeFromStateMap,
            isSelected,
            dispatch,
            updateCurrentState,
            currentState: { items: [], selected: [] }
        });
        // kick it off!
        this.setState(initialState);
        internals.get(this).initialState = getCurrentState();
    }
    revert(change) {
        return this.applyChange({
            [ADD]: change[REMOVE],
            [REMOVE]: change[ADD],
            [SELECT]: change[DESELECT],
            [DESELECT]: change[SELECT],
        });
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
    deselect(input) {
        return this.applyChange({
            [DESELECT]: input
        });
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
    reset() {
        const { initialState } = internals.get(this);
        console.log(initialState);
        return this.setState(initialState);
    }
    filter(predicate) {
        const { stateMap, dispatch, updateCurrentState, getPredicateArgs } = internals.get(this);
        let hasChanges = false;
        const changes = {
            [ADD]: [],
            [REMOVE]: [],
            [SELECT]: [],
            [DESELECT]: []
        };
        stateMap.forEach((item, index) => {
            const result = predicate(getPredicateArgs(item));
            if (result === true && item.filtered) {
                hasChanges = true;
                item.filtered = false;
                changes[ADD].push(item.value);
                if (item.selected) {
                    changes[SELECT].push(item.value);
                }
            }
            else if (result === false && !item.filtered) {
                hasChanges = true;
                item.filtered = true;
                changes[REMOVE].push(item.value);
                if (item.selected) {
                    changes[DESELECT].push(item.value);
                }
            }
        });
        updateCurrentState();
        dispatch({ hasChanges, hasErrors: false }, changes, []);
        return this;
    }
    some(predicate) {
        const { stateMap, getPredicateArgs } = internals.get(this);
        let someTrue = false;
        for (let [key, item] of stateMap) {
            if (item.filtered)
                continue;
            if (predicate(getPredicateArgs(item)) === true) {
                someTrue = true;
                break;
            }
        }
        return someTrue;
    }
    every(predicate) {
        const { stateMap, getPredicateArgs } = internals.get(this);
        let allTrue = true;
        for (let [key, item] of stateMap) {
            if (item.filtered)
                continue;
            const input = { value: item.value, selected: item.selected };
            if (predicate(getPredicateArgs(item)) !== true) {
                allTrue = false;
                break;
            }
        }
        return allTrue;
    }
    isSelected(input) {
        const { resolveItemsWith, resolverFor, isSelected, log } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'isSelected');
        log(errors, 'warn');
        return !!hits.length && hits.every(isSelected);
    }
    has(input) {
        const { resolveItemsWith, resolverFor, has } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.all, input);
        return !!hits.length && hits.every(has);
    }
    swap(input, newItem) {
        const { config, log, createLog, resolveItemsWith, resolverFor, resolveKey, isSelected, updateCurrentState, stateMap, dispatch } = internals.get(this);
        const { hits, errors } = resolveItemsWith(resolverFor.getting, input, 'swapping');
        let hasErrors = false;
        if (errors.length) {
            hasErrors = true;
            log(errors);
        }
        const oldItem = hits[0];
        const key = resolveKey(oldItem);
        const wasSelected = isSelected(oldItem);
        let hasChanges = false;
        if (!hasErrors) {
            hasChanges = true;
            stateMap.set(key, {
                value: newItem,
                selected: wasSelected
            });
        }
        updateCurrentState();
        dispatch({ hasChanges, hasErrors }, {
            [ADD]: [newItem],
            [SELECT]: wasSelected ? [newItem] : [],
            [DESELECT]: wasSelected ? [oldItem] : [],
            [REMOVE]: [oldItem]
        }, errors);
        return this;
    }
    setState(newState) {
        const { createStateObject, currentState } = internals.get(this);
        const { items, selected } = createStateObject(newState);
        return this.applyChange({
            [REMOVE]: currentState.items,
            [ADD]: items,
            [SELECT]: selected
        });
    }
    applyChange(changes) {
        const { log, addToStateMap, removeFromStateMap, config, dispatch, resolveItemsWith, resolverFor, updateCurrentState } = internals.get(this);
        const orderOfActions = [REMOVE, ADD, DESELECT, SELECT];
        const resolvedChanges = orderOfActions.reduce((acc, action) => {
            if (!changes[action] && changes[action] !== 0) {
                return acc;
            }
            const actions = {
                [REMOVE]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.getting, changes[REMOVE], REMOVE);
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;
                    if (!(acc.hasErrors && config.strict)) {
                        hits.forEach((item) => {
                            if (this.isSelected(item)) {
                                acc.changes[DESELECT].push(item);
                            }
                            
                        });
                    }
                    const change = !(acc.hasErrors && config.strict) ? removeFromStateMap(hits) : [];
                    acc.hasChanges = acc.hasChanges || !!change.length;
                    acc.changes[REMOVE] = change;
                },
                [ADD]: () => {
                    const { hits, errors } = resolveItemsWith(resolverFor.adding, changes[ADD], ADD);
                    log(errors);
                    acc.errors.push(...errors);
                    acc.hasErrors = acc.hasErrors || !!errors.length;
                    const change = !(acc.hasErrors && config.strict) ? addToStateMap(hits, { selected: false, filtered: false }) : [];
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
        updateCurrentState();
        const { hasChanges, hasErrors } = resolvedChanges;
        dispatch({ hasChanges, hasErrors }, resolvedChanges.changes, resolvedChanges.errors);
        return this;
    }
    get state() {
        const { currentState } = internals.get(this);
        return currentState;
    }
    get isValid() {
        const { validators } = internals.get(this).config;
        return validators.every(validator => validator(this.state, this));
    }
}

function createSelector(state, config = {}) {
    return new Selector(state, config);
}
var index = { createSelector };

exports.createSelector = createSelector;
exports['default'] = index;

Object.defineProperty(exports, '__esModule', { value: true });

})));
