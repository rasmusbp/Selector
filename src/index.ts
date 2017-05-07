/// <reference path="./selector.d.ts"/>

import Selector from './selector';

export function createSelector <T = any, P = any>(
    state?: Slc.StateInput<T,P> | T[],
    config: Slc.Settings = {}) : Slc.Selector<T,P> {
    return new Selector<T,P>(state, config);
}

export default { createSelector };

const selector = createSelector<{ id: string, name: string }, number>([
    { id: '1', name: 'John' }
]);


const state = selector.state.selected;
const mapped = state.map(item => {
    item.name = item.name + ' is awesome!'
    return item;
});


mapped.forEach(item => console.log(item.name));
state.forEach(item => console.log(item.name));