import Selector from './selector';
import {ISelectorStateInput, ISelectorSettings} from './selector';

function createSelector <ItemType = any, TrackByType = any>(
    state?: ISelectorStateInput<ItemType, TrackByType> | ItemType[],
    config: ISelectorSettings = {}) {
    return new Selector<ItemType, TrackByType>(state, config);
}

const defaults = { createSelector, Selector };
export default defaults;
export { createSelector, Selector };

const selector = createSelector<{ id: string, name: string }>([
    { id: '1', name: 'John' }
]);

const state = selector.state.selected;
const mapped = state.map(item => {
    item.name = item.name + ' is awesome!'
    return item;
});


mapped.forEach(item => console.log(item.name));
state.forEach(item => console.log(item.name));