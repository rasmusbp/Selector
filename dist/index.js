(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.StatefulSelector = global.StatefulSelector || {})));
}(this, (function (exports) { 'use strict';

var DeveloperMessage = (function () {
    function DeveloperMessage(message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.message = message;
        this.args = args.slice();
    }
    DeveloperMessage.prototype.print = function (_a) {
        var level = _a.level;
        switch (level) {
            case 'throw':
                throw new Error(this.message + JSON.stringify(this.args));
            case 'soft_throw':
                console.error.apply(console, [this.message].concat(this.args));
                break;
            case 'warn':
                console.warn.apply(console, [this.message].concat(this.args));
                break;
            case 'log':
                console.log.apply(console, [this.message].concat(this.args));
                break;
            default:
                console.log.apply(console, [this.message].concat(this.args));
                break;
        }
        return this;
    };
    return DeveloperMessage;
}());

var errors = {
    NO_ITEM: function (context) { return (context + " --> item does not exist."); },
    ALREADY_EXIST: function (context) { return (context + " --> item already exist."); },
    ALREADY_SELECTED: function (context) { return (context + " --> item is already selected."); },
    ALREADY_DESELECTED: function (context) { return (context + " --> item is already deselected."); },
    INVALID_TYPE: function (context) { return (context + " --> item must be of same type."); },
    INVALID_OBSERVER: function () { return "subscribe --> observer is not a function."; },
    INVALID_STATE: function (context) { return (context + " --> provided state is not valid. \n                    Make sure to provide valid 'items' and 'selections' arrays."); }
};

function flatten(arr) {
    return !Array.isArray(arr) ? [arr] : arr.reduce(function (acc, item) { return acc.concat(flatten(item)); }, []);
}
function getDeveloperMessage(_a) {
    var err = _a.err, _b = _a.details, details = _b === void 0 ? undefined : _b, _c = _a.strict, strict = _c === void 0 ? true : _c, _d = _a.context, context = _d === void 0 ? 'Selector' : _d;
    var errFn = errors[err] || (function () { return 'null'; });
    return new DeveloperMessage("Selector@" + errFn(context), details);
}
function getChangeErrors(changes) {
    var errors$$1 = Object.keys(changes).reduce(function (errors$$1, action) {
        return errors$$1.concat(changes[action].filter(function (change) { return change instanceof DeveloperMessage; }));
    }, []);
    return errors$$1.length ? errors$$1 : undefined;
}
function has(item, privates) {
    var itemsMap = privates.itemsMap, resolveKey = privates.resolveKey;
    return itemsMap.has(resolveKey(item));
}
function isSelected(items, privates) {
    var selectionsMap = privates.selectionsMap, resolveKey = privates.resolveKey;
    if (selectionsMap.size === 0)
        return false;
    return items.every(function (item) { return selectionsMap.has(resolveKey(item)); });
}
function isSomeSelected(items, privates) {
    var selectionsMap = privates.selectionsMap, resolveKey = privates.resolveKey;
    if (selectionsMap.size === 0)
        return false;
    return items.some(function (item) { return selectionsMap.has(resolveKey(item)); });
}
function addTo(map, items, privates) {
    var resolveKey = privates.resolveKey, config = privates.config;
    return items.reduce(function (hits, item) {
        if (item instanceof DeveloperMessage) {
            hits.push(item);
            return hits;
        }
        var key = resolveKey(item);
        var hasItem = !map.has(key);
        if (hasItem) {
            map.set(key, item);
            hits.push(item);
        }
        return hits;
    }, []);
}
function removeFrom(map, items, privates) {
    var resolveKey = privates.resolveKey, config = privates.config;
    return items.reduce(function (hits, item) {
        if (item instanceof DeveloperMessage) {
            hits.push(item);
            return hits;
        }
        var key = resolveKey(item);
        var wasRemoved = map.delete(key);
        if (wasRemoved) {
            hits.push(item);
        }
        return hits;
    }, []);
}
function dispatch(changes, privates) {
    var _this = this;
    var subscriptions = privates.subscriptions, noopChanges = privates.noopChanges, config = privates.config;
    var state = this.state;
    var errors$$1 = config.strict && getChangeErrors(changes);
    subscriptions.forEach(function (observers) {
        var args = [Object.assign(noopChanges, changes), state, _this];
        if (errors$$1) {
            observers.error.apply(observers, [errors$$1].concat(args));
            return;
        }
        observers.success.apply(observers, args);
    });
}
function resolveItems(input, context, privates) {
    var itemsMap = privates.itemsMap;
    if (typeof input === 'function') {
        var predicate_1 = input;
        return this.state.items.reduce(function (hits, item, index) {
            if (predicate_1(item, index) === true) {
                hits.push(item);
            }
            return hits;
        }, []);
    }
    var resolveKey = privates.resolveKey, config = privates.config;
    var normalizedInput = flatten([input]);
    var filter = function (inp) {
        return inp.reduce(function (acc, item) {
            var key = resolveKey(item);
            var hasItem = itemsMap.has(key);
            if (!hasItem && config.strict) {
                var error = getDeveloperMessage({ err: 'NO_ITEM', context, details: item });
                error.print({ level: 'warn' });
                acc.push(error);
            }
            else {
                acc.push(itemsMap.get(key));
            }
            return acc;
        }, []);
    };
    return filter(normalizedInput);
}
function resolveKey(item, privates) {
    var trackBy = privates.config.trackBy;
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
        getDeveloperMessage({ err: 'INVALID_STATE', context }).print({ level: 'throw' });
    }
    if (Array.isArray(state)) {
        return {
            get: function () { return ({
                items: state,
                selections: []
            }); }
        };
    }
    var isCorrectSchema = function () { return ([
        typeof state === 'object',
        Array.isArray(state.items),
        Array.isArray(state.selections)
    ]).every(function (condition) { return condition; }); };
    if (!isCorrectSchema()) {
        return {
            get: function () { return getDeveloperMessage({ err: 'INVALID_STATE', context }).print({ level: 'throw' }); }
        };
    }
    return {
        get: function () { return state; }
    };
}

var privates = new WeakMap();
var ADDED = 'added';
var REMOVED = 'removed';
var SELECTED = 'selected';
var DESELECTED = 'deSelected';
var Selector$1 = (function () {
    function Selector(initialState, config) {
        var _this = this;
        if (initialState === void 0) { initialState = {
            items: [],
            selections: []
        }; }
        if (config === void 0) { config = {}; }
        privates.set(this, {
            initialStateGetter: createStateGetter(initialState, 'initialStateGetter'),
            itemsMap: new Map(),
            selectionsMap: new Map(),
            subscriptions: new Set(),
            get noopChanges() {
                return (_a = {},
                    _a[ADDED] = [],
                    _a[SELECTED] = [],
                    _a[DESELECTED] = [],
                    _a[REMOVED] = [],
                    _a
                );
                var _a;
            },
            createStateGetter: createStateGetter.bind(this),
            resolveItems: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                return resolveItems.call.apply(resolveItems, [_this].concat(args, [privates.get(_this)]));
            },
            resolveKey: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                return resolveKey.call.apply(resolveKey, [_this].concat(args, [privates.get(_this)]));
            },
            operators: {
                has: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return has.call.apply(has, [_this].concat(args, [privates.get(_this)]));
                },
                addTo: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return addTo.call.apply(addTo, [_this].concat(args, [privates.get(_this)]));
                },
                removeFrom: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return removeFrom.call.apply(removeFrom, [_this].concat(args, [privates.get(_this)]));
                },
                dispatch: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return dispatch.call.apply(dispatch, [_this].concat(args, [privates.get(_this)]));
                },
                isSelected: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return isSelected.call.apply(isSelected, [_this].concat(args, [privates.get(_this)]));
                },
                isSomeSelected: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return isSomeSelected.call.apply(isSomeSelected, [_this].concat(args, [privates.get(_this)]));
                }
            },
            config: Object.assign({
                trackBy: undefined,
                strict: true,
                validators: [function () { return true; }],
                serializer: function (input) { return input; }
            }, config)
        });
        // kick it all off!
        var initialStateGetter = privates.get(this).initialStateGetter;
        this.setState(initialStateGetter.get());
    }
    Selector.prototype.subscribe = function (successObserver, errorObserver) {
        var _this = this;
        var subscriptions = privates.get(this).subscriptions;
        if ((!successObserver || typeof successObserver !== 'function') ||
            (errorObserver && typeof errorObserver !== 'function')) {
            getDeveloperMessage({ err: 'INVALID_OBSERVER' }).print({ level: 'throw' });
        }
        var observers = {
            success: successObserver,
            error: errorObserver
        };
        subscriptions.add(observers);
        return function () {
            subscriptions.delete(observers);
            return _this;
        };
    };
    Selector.prototype.select = function (input) {
        return this.patch((_a = {},
            _a[SELECTED] = input,
            _a
        ));
        var _a;
    };
    Selector.prototype.deSelect = function (input) {
        return this.patch((_a = {},
            _a[DESELECTED] = input,
            _a
        ));
        var _a;
    };
    Selector.prototype.selectAll = function () {
        return this.deSelectAll().select(this.state.items);
    };
    Selector.prototype.deSelectAll = function () {
        return this.deSelect(this.state.selections);
    };
    Selector.prototype.invert = function () {
        return this.toggle(this.state.items);
    };
    Selector.prototype.toggle = function (input) {
        var _this = this;
        var changes = flatten([input]).reduce(function (acc, item) {
            if (_this.isSelected(item)) {
                acc[DESELECTED].push(item);
            }
            else {
                acc[SELECTED].push(item);
            }
            return acc;
        }, (_a = {}, _a[SELECTED] = [], _a[DESELECTED] = [], _a));
        return this.patch(changes);
        var _a;
    };
    Selector.prototype.add = function (input) {
        return this.patch((_a = {},
            _a[ADDED] = flatten([input]),
            _a
        ));
        var _a;
    };
    Selector.prototype.remove = function (input) {
        return this.patch((_a = {},
            _a[REMOVED] = input,
            _a
        ));
        var _a;
    };
    Selector.prototype.removeAll = function () {
        return this.remove(this.state.items);
    };
    Selector.prototype.reset = function () {
        var initialStateGetter = privates.get(this).initialStateGetter;
        return this.setState(initialStateGetter.get());
    };
    Selector.prototype.isOnlySelected = function (input) {
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems;
        var items = resolveItems$$1(input, 'isOnlySelected');
        return operators.isSelected(items)
            && this.state.selections.length === items.length;
    };
    Selector.prototype.isSelected = function (input) {
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems;
        return operators.isSelected(resolveItems$$1(input, 'isSelected'));
    };
    Selector.prototype.isSomeSelected = function (input) {
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems;
        return operators.isSomeSelected(resolveItems$$1(input, 'isSomeSelected'));
    };
    Selector.prototype.has = function (input) {
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems;
        return operators.has(resolveItems$$1(input, 'has')[0]);
    };
    Selector.prototype.swap = function (input, newItem) {
        var _a = privates.get(this), operators = _a.operators, itemsMap = _a.itemsMap, selectionsMap = _a.selectionsMap, resolveItems$$1 = _a.resolveItems, resolveKey$$1 = _a.resolveKey;
        if (!this.has(input)) {
            throw new Error("Selector#swap -> cannot swap non-existing item");
        }
        var itemToReplace = resolveItems$$1(input)[0];
        var key = resolveKey$$1(input);
        if (this.isSelected(itemToReplace)) {
            selectionsMap.set(key, newItem);
        }
        itemsMap.set(key, newItem);
        operators.dispatch((_b = {},
            _b[ADDED] = [itemsMap.get(key)],
            _b[REMOVED] = [itemToReplace],
            _b
        ));
        return this;
        var _b;
    };
    Selector.prototype.setState = function (newState) {
        var state = this.state;
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems, itemsMap = _a.itemsMap, selectionsMap = _a.selectionsMap, createStateGetter$$1 = _a.createStateGetter;
        var validatedState = createStateGetter$$1(newState, 'setState').get();
        var deSelected = operators.removeFrom(selectionsMap, state.items);
        var removed = operators.removeFrom(itemsMap, state.items);
        var added = operators.addTo(itemsMap, validatedState.items);
        var selected = operators.addTo(selectionsMap, resolveItems$$1(validatedState.selections, 'setState'));
        operators.dispatch({ deSelected, selected, removed, added });
        return this;
    };
    Selector.prototype.patch = function (appliedPatch) {
        var _a = privates.get(this), operators = _a.operators, resolveItems$$1 = _a.resolveItems, itemsMap = _a.itemsMap, selectionsMap = _a.selectionsMap, noopChanges = _a.noopChanges, config = _a.config;
        var orderOfActions = [ADDED, SELECTED, REMOVED, DESELECTED];
        var changes = Object.assign(noopChanges, appliedPatch);
        var logLevel = 'warn';
        var validatedChanges = orderOfActions.reduce(function (acc, action) {
            switch (action) {
                case REMOVED:
                    acc[REMOVED] = operators.removeFrom(itemsMap, resolveItems$$1(changes[REMOVED], REMOVED));
                    break;
                case DESELECTED:
                    var deSelectedItems = resolveItems$$1(changes[DESELECTED], DESELECTED)
                        .map(function (item) {
                        if (!config.strict || operators.isSelected([item]))
                            return item;
                        return getDeveloperMessage({
                            err: 'ALREADY_DESELECTED',
                            context: DESELECTED,
                            details: item
                        }).print({ level: logLevel });
                    });
                    acc[DESELECTED] = operators.removeFrom(selectionsMap, deSelectedItems);
                    break;
                case ADDED:
                    var newItems = changes[ADDED]
                        .map(function (item) {
                        if (!config.strict || !operators.has(item))
                            return item;
                        return getDeveloperMessage({
                            err: 'ALREADY_EXIST',
                            context: ADDED,
                            details: item
                        }).print({ level: logLevel });
                    });
                    acc[ADDED] = operators.addTo(itemsMap, newItems);
                    break;
                case SELECTED:
                    var selectedItems = resolveItems$$1(changes[SELECTED], SELECTED)
                        .map(function (item) {
                        if (!config.strict || !operators.isSelected([item]))
                            return item;
                        return getDeveloperMessage({
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
        var hasChanged = Object.keys(validatedChanges).some(function (action) { return validatedChanges[action].length; });
        if (hasChanged) {
            operators.dispatch(validatedChanges);
        }
        return this;
    };
    Selector.prototype.replay = function (patches) {
        var _this = this;
        patches.forEach(function (patch) { return _this.patch(patch); });
        return this;
    };
    Selector.prototype.unsubscribeAll = function () {
        var subscriptions = privates.get(this).subscriptions;
        subscriptions.clear();
        return this;
    };
    Selector.prototype.serialize = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var serializer = privates.get(this).config.serializer;
        return serializer.apply(void 0, [this.state.selections].concat(args));
    };
    Object.defineProperty(Selector.prototype, "state", {
        get: function () {
            var _a = privates.get(this), selectionsMap = _a.selectionsMap, itemsMap = _a.itemsMap;
            return {
                items: Array.from(itemsMap.values()),
                selections: Array.from(selectionsMap.values())
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "hasSelections", {
        get: function () {
            var selectionsMap = privates.get(this).selectionsMap;
            return Boolean(selectionsMap.size);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "isAllSelected", {
        get: function () {
            return this.isSelected(this.state.items);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "isValid", {
        get: function () {
            var _this = this;
            var validators = privates.get(this).config.validators;
            return validators.every(function (validator) { return validator(_this.state.selections); });
        },
        enumerable: true,
        configurable: true
    });
    return Selector;
}());

function createSelector(items, config) {
    return new Selector$1(items, config);
}

exports.createSelector = createSelector;
exports['default'] = Selector$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
