import {createSelector} from '../src/index';

const items = [
   1,2,3,4,5,6,7
];

const selector = createSelector(items);

selector.subscribe((state, change) => {
    console.log('=============');
    console.log(change);
    console.log(state);
});

selector.select(1).filter(item => item.value > 3)