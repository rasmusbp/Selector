import {createSelector} from '../src/index';

const items = [
   1,2,3,4,5,6
];

const selector = createSelector(items);

selector.subscribe((changes, state) => {
    console.log(changes, state)
});