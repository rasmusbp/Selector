const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../src/index';

describe('When adding items', () => {
    context('with .add(...) in default mode', () => {   
        it('it can add a single item to current state', () => {
            const selector = createSelector([1,2,3]);
            selector.add(4);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can add an array of items to current state', () => {
            const selector = createSelector([1,2,3]);
            selector.add([4,5,6]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4,5,6],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will accept a function to determin items to add', () => {
            const selector = createSelector([1,2,3]);
            selector.add(state => state.items.map(item => item * 10));
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,10,20,30],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will maintain selections', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [1,2]
            });
            selector.add([4,5,6]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4,5,6],
                selections: [1,2]
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will not add duplicates', () => {
            const selector = createSelector([1,2,3]);
            selector.add(1);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

    });

    context('with .add(...) in debug mode', () => {
        let warn : sinon.SinonStub;

        beforeEach(() => warn = sinon.stub(console, 'warn'));
        afterEach(() => warn.restore());

        it('it warns about duplicates', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.add(1);
            const warning = warn.lastCall.args[0];

            expect(warning).to.include('added --> item already exist');
        });

        it('it still performs action if warning is logged', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3,4],
                selections: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });
    });

    context('with .add(...) in strict mode', () => {
         let error : sinon.SinonStub;

        beforeEach(() => error = sinon.stub(console, 'error'));
        afterEach(() => error.restore());

        it('it will log an error if trying to add existing items', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.add(1);
            const err = error.lastCall.args[0];
            expect(err).to.include('added --> item already exist');
        });

        it('it does not perform action on existing items if error is logged', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3],
                selections: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });
    });
});

describe('When removing items', () => {
    context('with .remove(...) in default mode ', () => {
        it('it can remove a single item from current state', () => {
            const selector = createSelector([1,2,3]);
            selector.remove(2);
            const state = selector.state;
            const expectedState = {
                items: [1,3],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can remove an array of items from current state', () => {
            const selector = createSelector([1,2,3]);
            selector.remove([2,3]);
            const state = selector.state;
            const expectedState = {
                items: [1],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can remove items using a predicate function', () => {
            const selector = createSelector([1,2,3]);
            selector.remove(item => item > 1);
            const state = selector.state;
            const expectedState = {
                items: [1],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can remove item by reference', () => {
            const subject = { id: 1, hello: 'world '};
            const another = { id: 1, hej: 'verden' };
            const selector = createSelector([ subject, another ]);
            selector.remove(subject);

            const state = selector.state;
            const expectedState = {
                items: [another],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });
        

        it('it will maintain selections', () => {
            const selector = createSelector({
                items: [1,2,3,4,5],
                selections: [1,2]
            });
            selector.remove([4,5]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3],
                selections: [1,2]
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will remove from selections if provided items are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [1,2]
            });
            selector.remove(1);
            const state = selector.state;
            const expectedState = {
                items: [2,3],
                selections: [2]
            };
            expect(state).to.deep.equal(expectedState);
        });
    });

    context('with .remove(...) in track by mode ', () => {
        it('it can remove items based on an array of properties', () => {
                const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];

            const selector = createSelector<{id: string}>({
                items,
                selections: [
                    { id: '4', name: 'Ben' },
                    { id: '3', name: 'Leia' }
                ]
            }, { trackBy: 'id' });

            selector.remove('3');
            
            const expectedState = {
                items: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' },
                    { id: '4', name: 'Ben' }
                ],
                selections: [{ id: '4', name: 'Ben' }]
            }

            expect(selector.state).deep.equal(expectedState);
        });
    });

    context('with .remove(...) in debug mode', () => {
         let warn : sinon.SinonStub;

        beforeEach(() => warn = sinon.stub(console, 'warn'));
        afterEach(() => warn.restore());

        it('it will warn about removing non-existing items', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.remove(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('removed --> item does not exist');
        });

        it('it still performs action on existing items if warning is logged', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.remove([1,4]);
            const expectedState = {
                items: [2,3],
                selections: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });
    });

    context('with .remove(...) in strict mode', () => {
         let error : sinon.SinonStub;

        beforeEach(() => error = sinon.stub(console, 'error'));
        afterEach(() => error.restore());

        it('it will log an error if trying to remove non-existing items', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.remove(4);
            const err = error.lastCall.args[0];
            expect(err).to.include('removed --> item does not exist');
        });

        it('it does not perform action on existing items if error is logged', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3],
                selections: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });
    });
});