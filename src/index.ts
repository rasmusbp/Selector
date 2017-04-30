import Selector from './Selector';
import {ISelectorState, ISelectorConfig} from './Selector';

export function createSelector <ItemType = any, TrackByType = any>(
    state: ItemType[] | ISelectorState<ItemType>,
    config: ISelectorConfig = undefined) {
    return new Selector<ItemType, TrackByType>(state, config);
}

const obj = { id: 1, name: 'John' }
const selector = createSelector([obj], { trackBy: 'id' });

selector.subscribe((changes, state, sel) => {
    console.log(changes, state, sel)
});

selector.select(1);

export default Selector;
