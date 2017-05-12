import {createSelector} from '../src/index';

const items = [
    { id: '1', name: 'Ben Kenobi', age: 88 },
    { id: '2', name: 'Luke Skywalker', age: 30 },
    { id: '3', name: 'Han Solo', age: 43 },
    { id: '4', name: 'Chewie Bear', age: 66 },
]

const selector = createSelector<{ id: string }>(items);

selector.subscribe((state, change) => {
    console.log(state);
    console.log(change);
    console.log('============================');
});

selector.select(item => item.value.id === '1');
