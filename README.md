# Selector
> Abstraction to centralize common selection patterns and make local state management less painfull.

## A word on state management
Eventhough it's common practice not to encourage building state machines, sometimes local state management in a system is a nescessity _(or simply the lesser evil)_.

Following the modern paradigmes of compentizing systems, be it UI components or function compositions server side, somewhere in the stack state management ~~can be~~ is needed.

On the frontend side of things popular libraries like Redux and Flux implementations deliver on the promise of keeping the state of the entire application a _(more)_ managable task. However, a state of an application is an abritary thing, and it's up to the application's author(s) to describe the state and how it can be changed.
In other words we have a generic method of handling state, but the construct of the state itself is properitary to the application. This makes sense since we're working on an application scale and non-trivial states are expected.

But, what if we simply want a low-level state manangement of an isolated compenent, without knowing about nor influencing the application's state?

Often, we have a component that, for a period of time or through a chain of user interactions, keeps a local state before commiting to any higher-level state. 
A classic example of this is a todo list where the user can perform bulk actions on a subset of the items in the list.
The subset can be seen as a local state of the list, and the bulk action itself is what translates the local state into a state of the application.

It can said that the subset of items is in a "selected" state and the rest is not.
By deducing a state into a binary representation it becomes a lot simpler to reason about and less painful to manage.

## Get started

Install via npm:

`npm install stateful-selector`

Create an instance
```js
import {createSelector} from 'stateful-selector';
const selector = createSelector();
```

## API
### Methods
---
#### createSelector(initialState?, config?)
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

### .add()
Add items to selector.
```js
const selector = createSelector();
selector.add([1,2,3]);

// or with an iterator

const selector = createSelector([1,2,3]);
selector.add(item => item.value * 2);
console.log(seletor.state.items) // [1,2,3,4,6]
```

In `debug` mode you'll get warnings if trying to add existing items. In `strict` mode no items will be added if one of the items already exist.

```js
const selector = createSelector([1], { debug: true });
selector.add([1,2,3]); // will add 2 and 3, but output a warning saying that 1 is an existing item
```

```js
const selector = createSelector([1], { strict: true });
selector.add([1,2,3]); // will NOT add 2 and 3 and output a warning saying that 1 is an existing item
```

### .remove()
Remove items from selector.
```js
const selector = createSelector([1,2,3]);
selector.remove([1,2,3]);

// or with a predicate

const selector = createSelector([1,2,3]);
selector.add(item => item.selected);
console.log(seletor.state.items) // [1,2,3,4,6]
```

In `debug` mode you'll get warnings if trying to add existing items. In `strict` mode no items will be added if one of the items already exist.

```js
const selector = createSelector([1], { debug: true });
selector.add([1,2,3]); // will add 2 and 3, but output a warning saying that 1 is an existing item
```

```js
const selector = createSelector([1], { strict: true });
selector.add([1,2,3]); // will NOT add 2 and 3 and output a warning saying that 1 is an existing item
```