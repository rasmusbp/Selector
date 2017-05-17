# Selector API

- [methods](#methods)
    - [createSelector()](#createselector)
    - [.add()](#add)
    - [.remove()](#remove)
    - [.select()](#select)
    - [.deselect()](#deselect)
    - [.toggle()](#toggle)
    - [.filter()](#filter)
    - [.invert()](#invert)
    - [.revert()](#reset)
    - [.setState()](#setstate)
    - [.applyChange()](#applychange)
    - [.reset()](#reset)
    - [.swap()](#swap)
    - [.subscribe()](#subscribe)
    - [.isSelected()](#isselected)
    - [.has()](#has)
    - [.every()](#every)
    - [.some()](#some)
- [properties](#properties)
    - [.isValid](#isvalid)
    - [.state](#state)

### Methods
---
#### createSelector()
> `createSelector(initialState?, config?)`

Returns an instance of `Selector`. 
Can be invoked with an initial state and/or with a configuration.
```js
// array describing initial state
const selector = createSelector([1,2,3,4]);
```

```js
// state object with predetermined selections
const selector = createSelector({
    items: [1,2,3,4],
    selected: [1,2]
});
```
```js
// with configuration object
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], {
    trackBy: 'id',
    debug: true,
    strict: true,
    validators: [
        state => state.selected.length > 0
    ],
    providers: {
        Log: AnotherLoggingProvider
    }
});
```

The configuration object consists of following options:
```js
trackBy: string // track objects in list by a property rather than by reference
debug: boolean // provides useful feedback to developer in the console
strict: boolean // will cancel actions on any errors
validators: Function[] // a set of functions that shall determine the validity of the instance
providers: Object {
    Log: Class // override Class for logging. Overwrite must implement the Slc.StateLog interface
}
```

In `debug` mode you'll get warnings in the console when trying to perform redundant actions. I.e adding already existing items. In `strict` mode no action will be performed if one an invalid state change is attempted.

```js
// ## debug mode
const selector = createSelector([1,2], { debug: true });
// outputs a warning saying that 1 and 2 are existing items, but will still add 3.
selector.add([1,2,3]); 

// outputs a warning saying that 9 does not exist, but will still select 1.
selector.select([1,9]); 

// outputs a warning saying that 2 is not selected, but will still deselect 1.
selector.deselect([1,2]);

// ## strict mode
const selector = createSelector([1,2], { strict: true });
// outputs an error saying that 1 and 2 are existing items, and will NOT add 3.
selector.add([1,2,3]);

// outputs an error saying that 9 does not exist, and will NOT select 1.
selector.select([1,9]); 

// outputs a error saying that 2 is not selected, and will NOT deselect 1.
selector.select(1).deselect([1,2]);
```

### .add()
> `.add( item | item[] | iterator ) : instance`

Add items to selector.
```js
const selector = createSelector();
selector.add([1,2,3]);

// or with an iterator
const selector = createSelector([1,2,3]);
selector.add(item => item.value * 2);
console.log(seletor.state.items); // [1,2,3,4,6]
```
### .remove()
> `.remove( item | item[] | trackByProp | trackByProp[] | predicate  ) : instance`

Remove items from selector.
```js
const selector = createSelector([1,2,3]);
selector.remove([1,2,3]);

// or with a predicate
const selector = createSelector({
    items: [1,2,3,4],
    selected: [1,2]
});
selector.remove(item => item.selected);
console.log(seletor.state.items); // [3,4]

// or by property in track-by mode
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], { trackBy: 'id' })

selector.remove(['a', 'b']) 

console.log(seletor.state.items); // [{ id: 'c', name: 'Leia' }]
```

### .select()
> `.select( item | item[] | trackByProp | trackByProp[] | predicate  ) : instance`

Select items from selector.
```js
const selector = createSelector([1,2,3]);
selector.select([2,3]);

// or with a predicate
const selector = createSelector([1,2,3]);
selector.select(item => item.value > 1);
console.log(seletor.state.selected); // [2,3]

// or by property in track-by mode
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], { trackBy: 'id' })

selector.select('c') 

console.log(seletor.state.selected); // [{ id: 'c', name: 'Leia' }]
```

### .deselect()
> `.deselect( item | item[] | trackByProp | trackByProp[] | predicate  ) : instance`

Deselect items from selector.
```js
const selector = createSelector([1,2,3]);
selector
    .select([2,3])
    .deselect(2); // <- ( or [2] )

// or with a predicate
const selector = createSelector([1,2,3]).select([2,3])
selector.deselect(item => item.value > 1);
console.log(seletor.state.selected); // []

// or by property in track-by mode
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], { trackBy: 'id' })

selector
    .select(['a', 'b', 'c'])
    .deselect(['a'. 'b']); 

console.log(seletor.state.selected); // [{ id: 'c', name: 'Leia' }]
```

### .filter()
> `.filter( predicate  ) : instance`

Filter items and selections.
```js
const selector = createSelector([1,2,3,4,5,6]);
selector
    .select([1,2,3])
    .filter(item => item.value > 2)

console.log(selector.state.items) // [3,4,5,6]
console.log(selector.state.selected) // [3]

// when unfiltering the "selected" state will be maintained
selector.filter(item => true);

console.log(selector.state.items) // [1,2,3,4,5,6]
console.log(selector.state.selected) // [1,2,3]
```

