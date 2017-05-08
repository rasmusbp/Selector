import {createSelector} from '../src/index';



const items = [
    { id: '1', name: 'John'},
    { id: '2', name: 'Han'},
    { id: '3', name: 'Luke'},
]

const selector = createSelector(items, { trackBy: 'name', debug: true });
const filterByName = name => item => item.name === 'Luke';



const applyChange = (change) => {
    let lastChange;
    const un = selector.subscribe((change) => {
        lastChange = change;
        un();
        console.log(change)
    });
    return selector.applyChange(change).revert.bind(selector, lastChange);
}

const undo = applyChange({ add: [{ id: '4', name: 'Felix '}]})

setTimeout(undo, 2000);