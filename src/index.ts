import Selector from './selector';
import {ISelectorState, ISelectorConfig} from './selector';

function createSelector <ItemType = any, TrackByType = any>(
    state?: ItemType[] | ISelectorState<ItemType>,
    config: ISelectorConfig = {}) {
    return new Selector<ItemType, TrackByType>(state, config);
}

const defaults = { createSelector, Selector };
export default defaults;
export { createSelector, Selector };