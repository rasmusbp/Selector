import Logger from './logger';
import errors from './error-messages';
import SelectorError from './selector-error';
import flatten from './flatten';

export function logger ({
    reason,
    details,
    context = 'Selector',
}) {
    const errFn = errors[reason] || (() => 'null');
    return new Logger(`Selector@${errFn(context)}`, details);
}

export function createSelectorError<ItemType>({
    reason,
    details,
    context = 'Selector',
}) {
    const errFn = errors[reason] || (() => 'null');
    return new SelectorError<ItemType>(`Selector@${errFn(context)}`, reason, details)
}
export function getChangeErrors (changes) {
    const errors = Object.keys(changes).reduce((errors, action) => {
        return [...errors, ...changes[action].filter(change => change instanceof SelectorError)];
    }, []);
    return errors.length ? errors : undefined;
}

export function addTo (map, items, internals) {
    const { resolveKey, config } = internals
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

export function removeFrom (map, items, internals) {
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

export function resolveItems <ItemType = any>(input, context, internals) {
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
    const validate = (inp: any[]) => {
        return inp.reduce((acc, item) => {
            const key = resolveKey(item);
            const hasItem = itemsMap.has(key);
            if (!hasItem && config.strict && context) {
                const err = { reason: 'NOT_EXIST', context, details: item };
                logger(err).print({ level: 'warn' });
                acc.push(createSelectorError(err));
            } else {
                acc.push(itemsMap.get(key));
            }
            return acc;
        }, []);
    };

    return validate(normalizedInput);
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
        logger({ reason: 'INVALID_STATE', context, details: state }).print({ level: 'throw' });
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
            get: () => logger({ reason: 'INVALID_STATE', context, details: state }).print({ level: 'throw' })
        }
        
    }
    return {
        get: () => state
    };
}