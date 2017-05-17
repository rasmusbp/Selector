# Selector
> A small ~3KB (gzipped) dependency-free abstraction to centralize common selection patterns and make local state management less painfull.

- [Get started](#get-started)
- [Usage](./usage.md)
- [API](./api.md)

## A word on state management
Eventhough it's common practice not to encourage building state machines, sometimes local state management in a system is a nescessity _(or simply the lesser evil)_.

Even when following the paradigmes of compentizing systems, be it UI components or function compositions server side, somewhere in the stack state management ~~can be~~ is needed.

On the frontend side of things popular libraries like Redux and Flux implementations deliver on the promise of keeping the state of the entire application a _(more)_ managable task. However, a state of an application is an abritary thing, and it's up to the application's author(s) to describe the state and how it can be changed.
In other words we have a generic method for handling state, but the construct of the state itself is properitary to the application. This makes sense since we're working on an application scale and non-trivial states are expected.

But, what if we simply want a low-level state manangement of an isolated compenent, without knowing about nor influencing the application's state?

Often, we have a component that, for a period of time or through a chain of user interactions, keeps a local state before commiting to any higher-level state. 
A classic example of this is a todo list where the user can perform bulk actions on a subset of the items in the list.
The subset can be seen as a local state of the list, and the bulk action itself is what translates the local state into a state of the application.

It can be said that the subset of items is in a "selected" state and the rest is not.
By deducing a state into a binary representation it becomes a lot simpler to reason about and less painful to manage.

## Get started

Install via npm:

```
npm install stateful-selector
```

Create an instance
```js
import {createSelector} from 'stateful-selector';
const selector = createSelector();
```

**Enjoy!**