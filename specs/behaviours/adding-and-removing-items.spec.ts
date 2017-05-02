const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../../src/index';

describe('When adding items', () => {
    let warn : sinon.SinonStub;

    beforeEach(() => warn = sinon.stub(console, 'warn'));
    afterEach(() => warn.restore());

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

        it('it will warn about duplicates', () => {
            const selector = createSelector([1,2,3]);
            selector.add(1);
            const warning = warn.lastCall.args[0];

            expect(warning).to.include('added --> item already exist');
        });
    });

    context('with .add(...) in non-strict mode', () => {
        it('it will not add duplicates', () => {
            const selector = createSelector([1,2,3], { strict: false });
            selector.add(1);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3],
                selections: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will not warn about duplicates', () => {
            const selector = createSelector([1,2,3], { strict: false });
            selector.add(1);
            expect(warn).not.to.have.been.called;
        });
    });
});

describe('When removing items', () => {
    let warn : sinon.SinonStub;

    beforeEach(() => warn = sinon.stub(console, 'warn'));
    afterEach(() => warn.restore());

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

        it('it will warn about removing non-existing items', () => {
            const selector = createSelector([1,2,3]);
            selector.remove(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('removed --> item does not exist');
        });

    });

     context('with .remove(...) in non-strict mode', () => {
        it('it will not warn removing non-existing items', () => {
            const selector = createSelector([1,2,3], { strict: false });
            selector.remove(4);
            expect(warn).not.to.have.been.called;
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
});