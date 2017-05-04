import Selector from './selector';
import {ISelectorState, ISelectorSettings} from './selector';

function createSelector <ItemType = any, TrackByType = any>(
    state?: ItemType[] | ISelectorState<ItemType>,
    config: ISelectorSettings = {}) {
    return new Selector<ItemType, TrackByType>(state, config);
}

const defaults = { createSelector, Selector };
export default defaults;
export { createSelector, Selector };
