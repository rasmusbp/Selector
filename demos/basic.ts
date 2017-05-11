import {createSelector} from '../src/index';

const items = [
   { id: 1 }
];

const selector = createSelector(items);

selector.subscribe((state, changes) => {
    console.log(changes, state)
});