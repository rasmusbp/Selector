import Selector from './selector';
import SelectorError from './selector-error';
import Logger from './logger';
import {ISelectorState, ISelectorConfigInput, ISelectorConfig} from './selector';

export function createSelector <ItemType = any, TrackByType = any>(
    state?: ItemType[] | ISelectorState<ItemType>,
    config: ISelectorConfigInput = {}) {

    const extendedConfig : ISelectorConfig = Object.assign({
        providers: Object.assign({
            error: SelectorError,
            logger: Logger
        }, config.providers)
    }, config);

    return new Selector<ItemType, TrackByType>(state, extendedConfig);
}

export default Selector;
