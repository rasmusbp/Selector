import Selector from './selector';
import {ISelectorState, ISelectorConfig} from './selector';

export function createSelector <ItemType = any, TrackByType = any>(
    state?: ItemType[] | ISelectorState<ItemType>,
    config: ISelectorConfig = undefined) {
    return new Selector<ItemType, TrackByType>(state, config);
}

export default Selector;
