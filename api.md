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
    - [.setState()](#setstate)
    - [.reset()](#reset)
    - [.applyChange()](#applychange)
    - [.subscribe()](#subscribe)
    - [.revert()](#revert)
    - [.swap()](#swap)
    - [.every()](#every)
    - [.some()](#some)
- [properties](#properties)
    - [.state](#state)
    - [.isValid](#isvalid)

### Methods
---
#### createSelector() 
> `createSelector(initialState?, config?)`

Returns an instance of `Selector`. 
Can be invoked with an optional initial state and with a configuration.
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

In `debug` mode you'll get warnings in the console when trying to perform redundant actions. I.e adding already existing items. In `strict` mode no state change will be applied if there's an invalid state change attempted. See below for examples.

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

[[Back to top](#selector-api)]
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

[[Back to top](#selector-api)]
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

[[Back to top](#selector-api)]
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
    .deselect(['a', 'b']); 

console.log(seletor.state.selected); // [{ id: 'c', name: 'Leia' }]
```

[[Back to top](#selector-api)]
### .toggle()
> `.toggle( item | item[] | trackByProp | trackByProp[] | predicate  ) : instance`

Toggle selection of items from selector.
```js
const selector = createSelector([1,2,3]);
selector
    .select([2,3])
    .toggle([1,2,3]);

console.log(seletor.state.selected); // [1]

// or with a predicate
const selector = createSelector([1,2,3]).select([2,3])
selector.toggle(item => item.value > 0);
console.log(seletor.state.selected); // [1]

// or by property in track-by mode
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], { trackBy: 'id' })

selector
    .select(['a', 'b'])
    .toggle(['a', 'b', 'c']); 

console.log(seletor.state.selected); // [{ id: 'c', name: 'Leia' }]
```

[[Back to top](#selector-api)]
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

[[Back to top](#selector-api)]
### .invert()
> `.invert() : instance`

Invert current state.
```js
const selector = createSelector({
    items: [1,2,3,4,5,6],
    selected: [1,2,3]
});

console.log(selector.state.selected) // [4,5,6]
```

[[Back to top](#selector-api)]
### .setState()
> `.setState( StateLike ) : instance`

Set a new state. 
Will overwrite previous state.
```js
const selector = createSelector({
    items: ['a','b','c'],
    selected: ['a']
});

selector.setState({
    items: [1,2,3,4,5,6],
    selected: [1,2,3]
});

console.log(selector.state.items) // [1,2,3,4,5,6]
console.log(selector.state.selected) // [1,2,3]
```

[[Back to top](#selector-api)]
### .reset()
> `.reset() : instance`

Reset state to initial state.
```js
const selector = createSelector({
    items: ['a','b','c'],
    selected: ['a']
});

selector.select('c');

selector.setState({
    items: [1,2,3,4,5,6],
    selected: [1,2,3]
});

selector.reset();

console.log(selector.state.items) // ['a','b','c']
console.log(selector.state.selected) // ['a']
```

[[Back to top](#selector-api)]
### .applyChange()
> `.applyChange( ChangeLike ) : instance`

Apply a change set to the selector.
A change set is a patch object describing the main actions:

`add, remove, select and deselect`.
```js
const selector = createSelector({
    items: [1,2,3,4,5,6],
    selected: [1,2,3]
});

selector.applyChange({
    add: [7,8,9,10],
    remove: item => item.value > 3,
    select: [7,8],
    deselect: [2,3]
});

console.log(selector.state.items) // [1,2,3,7,8,9]
console.log(selector.state.selected) // [1,7,8]
```

[[Back to top](#selector-api)]
### .subscribe()
> `.subscribe( observer, errorObserver? ) : instance`

Subscribe to state changes on the instance.

```js
const selector = createSelector({
    items: [1,2,3],
    selected: [3]
});

selector.subscribe((state, change) => {
    console.log(state); // <- current state
    console.log(change); // { add: [], remove: [2,3], select: [], deselect: [3] }
});

selector.remove([2,3]);
```

**NOTE:** In `strict` mode only the error observer will invoke if invalid changes are attempted. In `default` mode both observers will be invoked.

```js
// ## default mode
const selector = createSelector([1,2,3]);

selector.subscribe(
    (state, change) => {
        console.log(change); // { add: [10], remove: [], select: [], deselect: [] }
    },
    (errors, state) => {
        errors.forEach(error => error.print()); // <- "/item already exist/, [2]"
    }
    
);

selector.add([2,10]);

// ## strict mode
const selector = createSelector([1,2,3], { strict: true });

selector.subscribe(
    (state, change) => {
        // not invoked ... ¯\_(ツ)_/¯
    },
    (errors, state) => {
        errors.forEach(error => error.print()); // <- "/item already exist/, [2]"
    }
    
);

selector.add([2,10]);
```

[[Back to top](#selector-api)]
### .revert()
> `.revert( Change ) : instance`

Revert provided change set.

```js
const selector = createSelector({
    items: [1,2,3,4,5,6],
    selected: [1,2,3]
});

let lastestChange;
selector.subscribe((state, change) => {
    lastestChange = change;
});

selector.remove([1,2,3]);

console.log(selector.state.items) // [4,5,6]
console.log(selector.state.selected) // []

selector.revert(lastestChange);

console.log(selector.state.items) // [1,2,3,4,5,6]
console.log(selector.state.selected) // [1,2,3]
```

[[Back to top](#selector-api)]
### .swap()
> `.swap(target, newItem) : instance`

Swap an existing item for a new item.
Very useful if working with immutable data structures.

```js
const selector = createSelector([1,2,3]);

selector.swap(2, 42);
console.log(selector.state.items) // [1,42,3]

// or by property in track-by mode
const selector = createSelector([
    { id: 'a', name: 'Luke' },
    { id: 'b', name: 'Han' },
    { id: 'c', name: 'Leia' },
], { trackBy: 'id' });


selector.swap('b', { id: 'b', name: 'Chewie' });
console.log(selector.state.items.) // { id: 'a', name: 'Luke' }, { id: 'b', name: 'Chewie' }, ... etc.,
```

[[Back to top](#selector-api)]
### .every()
> `.every( predicate  ) : boolean`

Check if all items meet specified condition(s).

```js
const selector = createSelector([1,2,3, 100, 200, 300]);
selector.select([100,200]);

// check if certain items are selected
const allBigSelected = selector.every(item => {
    return item.value > 99 ? item.selected : true;
});

console.log(allBigSelected); // false, since 300 is not selected.

// check if all items are selected
selector.select(selector.state.items);
const allSelected = selector.every(item => item.selected);

console.log(allSelected); // true
```

[[Back to top](#selector-api)]
### .some()
> `.some( predicate  ) : boolean`

Check if some items meet specified condition(s).

```js
const selector = createSelector([1,2,3, 100, 200, 300]);
selector.select([100,200]);

const someBigSelected = selector.some(item => {
    return item.value > 99 ? item.selected : false;
});

console.log(someBigSelected); // true
```

### Properties
---

### .state
> `.state : StateObject`

Yields the current state. When the state changes it yields a new state object.

```js
const selector = createSelector([1,2,3]);

const firstState = selector.state;

console.log(firstState) // { items: [1,2,3], selected: [] }

// state hasn't changed so each `get` will yield the same object
console.log(firstState === selector.state) // true

// state changes
selector.select([1,2]);

const secondState = selector.state;
console.log(secondState) // { items: [1,2,3], selected: [1,2] }
console.log(firstState === secondState) // false
console.log(firstState) // { items: [1,2,3], selected: [] }
```

[[Back to top](#selector-api)]
### .isValid
> `.isValid : boolean`

Yields the current validity of the selector.
The validity is determined by the validators provided at construction.

```js
const selector = createSelector([1,2,3], {
    validators: [
        /* 1. */ state => state.selected.length > 0,
        /* 2. */ (state, slc) => slc.some(item => item.value > 10)
    ]
});

console.log(selector.isValid) // false, since both 1. and 2. are falsy

selector.select(1);
console.log(selector.isValid) // false, since only 1. is truthy

selector.add([15]);
console.log(selector.isValid) // true, since all validators are truthy

selector.filter(item => item.value > 99);
console.log(selector.isValid) // false, since we've filtered out all items that made the validators truthy
```
[[Back to top](#selector-api)]
