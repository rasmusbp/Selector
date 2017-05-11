import Selector from './selector';

export function createSelector <T = any, P = string>(
    state?: Slc.StateLike<T,P> | T[],
    config: Slc.Settings = {}) : Slc.Selector<T,P> {
    return new Selector<T,P>(state, config);
}

export default { createSelector };

const selector = createSelector<any, number>([
    { id: 1, age: 10 },
    { id: 2, age: 11 },
    { id: 3, age: 13 },
    { id: 4, age: 19 },
    { id: 5, age: 21 },
    { id: 6, age: 33 },
    { id: 7, age: 78 },
], { trackBy: 'age', debug: false });

selector.subscribe((state, changes) => {
    console.log('=================================');
    console.log(state);
    console.log(changes);
});

selector
    //.add({ id: 1000000, age: 99999 })
    .select([21,10,11])
    .filter(item => item.value.age > 30);


//selector.filter(() => true);
