import Selector from './selector';
import {ISelectorState, ISelectorSettings} from './selector';

function createSelector <ItemType = any, TrackByType = any>(
    state?: ISelectorState<ItemType, TrackByType> | ItemType[],
    config: ISelectorSettings = {}) {
    return new Selector<ItemType, TrackByType>(state, config);
}

const defaults = { createSelector, Selector };
export default defaults;
export { createSelector, Selector };

const selector = createSelector([1,2,3,4]);

selector.select([2,3])

console.log(selector.state)

selector.toggle((item) => {
    return item === 2 || item === 4
})

console.log(selector.state)
