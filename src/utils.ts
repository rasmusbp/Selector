import DeveloperMessage from './DeveloperMessage';
import errors from './errors'

export function flatten(arr) : any[] {
  return !Array.isArray(arr) ? [arr] : arr.reduce((acc, item) => [
    ...acc,
    ...flatten(item)
  ], []);
}

export function getDeveloperMessage ({
    err,
    details = undefined,
    strict = true,
    context = 'Selector',
}) {
    const errFn = errors[err] || (() => 'null');
    return new DeveloperMessage(`Selector@${errFn(context)}`, details);
}

export function getChangeErrors (changes) {
    const errors = Object.keys(changes).reduce((errors, action) => {
        return [...errors, ...changes[action].filter(change => change instanceof DeveloperMessage)];
    }, []);
    return errors.length ? errors : undefined;
}

export function has (item, internals) {
    const { itemsMap, resolveKey } = internals;
    return itemsMap.has(resolveKey(item));
}

export function isSelected (items, internals) {
    const { selectionsMap, resolveKey } = internals;
    if (selectionsMap.size === 0) return false;
    return items.every(item => selectionsMap.has(resolveKey(item)));
}

export function isSomeSelected (items, internals) {
    const { selectionsMap, resolveKey } = internals;
    if (selectionsMap.size === 0) return false;
    return items.some(item => selectionsMap.has(resolveKey(item)));
}

export function addTo (map, items, internals) {
    const { resolveKey, config } = internals
    return items.reduce((hits, item) => {
        if (item instanceof DeveloperMessage) {
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

export function removeFrom (map, items, internals) {
    const { resolveKey, config } = internals;
    return items.reduce((hits, item) => {
        if (item instanceof DeveloperMessage) {
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

export function dispatch (changes, state, internals) {
    const { subscriptions, noopChanges, config } = internals;
    const errors = config.strict && getChangeErrors(changes);
    subscriptions.forEach((observers) => {
        const args = [Object.assign(noopChanges, changes), state, this];
        if (errors) {
            observers.error(errors, ...args);
            return;
        }
        observers.success(...args);
    });
}

export function resolveItems (input, context, internals) {
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
    const filter = (inp: any[]) => {
        return inp.reduce((acc, item) => {
            const key = resolveKey(item);
            const hasItem = itemsMap.has(key);
            if (!hasItem && config.strict) {
                const error = getDeveloperMessage({ err: 'NO_ITEM', context, details: item });
                error.print({ level: 'warn' });
                acc.push(error);
            } else {
                acc.push(itemsMap.get(key));
            }
            return acc;
        }, []);
    };

    return filter(normalizedInput);
}

export function resolveKey (item, internals) {
    const { trackBy } = internals.config;

    if (!trackBy || (typeof item !== 'object' && item !== null)) {
        return item
    }
    if (typeof trackBy === 'function') {
        return trackBy(item);
    }
    return item[trackBy];
}

export function createStateGetter (state, context) {
    if (!state) {
        getDeveloperMessage({ err: 'INVALID_STATE', context }).print({ level: 'throw' });
    }

    if (Array.isArray(state)) {
        return {
            get: () => ({
                items: state,
                selections: []
            })
        }
    }

    const isCorrectSchema = () => ([
        typeof state === 'object',
        Array.isArray(state.items),
        Array.isArray(state.selections)
    ]).every(condition => condition);

    if (!isCorrectSchema()) {
        return {
            get: () => getDeveloperMessage({ err: 'INVALID_STATE', context }).print({ level: 'throw' })
        }
        
    }
    return {
        get: () => state
    };
}