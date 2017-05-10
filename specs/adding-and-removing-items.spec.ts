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
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can add an array of items to current state', () => {
            const selector = createSelector([1,2,3]);
            selector.add([4,5,6]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4,5,6],
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will accept a function to determin items to add', () => {
            const selector = createSelector([1,2,3]);
            selector.add(state => state.items.map(item => item * 10));
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,10,20,30],
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will maintain selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [1,2]
            });
            selector.add([4,5,6]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4,5,6],
                selected: [1,2]
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will not add duplicates', () => {
            const selector = createSelector([1,2,3]);
            selector.add(1);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3],
                selected: []
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

            expect(warning).to.include('add --> item already exist');
        });

        it('it still performs action if warning is logged', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3,4],
                selected: []
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
            expect(err).to.include('add --> item already exist');
        });

        it('it does not perform action on existing items if error is logged', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3],
                selected: []
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
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can remove an array of items from current state', () => {
            const selector = createSelector([1,2,3]);
            selector.remove([2,3]);
            const state = selector.state;
            const expectedState = {
                items: [1],
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it can remove items using a predicate function', () => {
            const selector = createSelector([1,2,3]);
            selector.remove(item => item.value > 1);
            const state = selector.state;
            const expectedState = {
                items: [1],
                selected: []
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
                selected: []
            };
            expect(state).to.deep.equal(expectedState);
        });
        

        it('it will maintain selected', () => {
            const selector = createSelector({
                items: [1,2,3,4,5],
                selected: [1,2]
            });
            selector.remove([4,5]);
            const state = selector.state;
            const expectedState = {
                items: [1,2,3],
                selected: [1,2]
            };
            expect(state).to.deep.equal(expectedState);
        });

        it('it will remove from selected if provided items are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [1,2]
            });
            selector.remove(1);
            const state = selector.state;
            const expectedState = {
                items: [2,3],
                selected: [2]
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

            const selector = createSelector<{}, string>({
                items,
                selected: [
                    { id: '4', name: 'Ben' },
                    { id: '3', name: 'Leia' }
                ]
            }, { trackBy: 'id' });

            selector.remove('3')
            
            const expectedState = {
                items: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' },
                    { id: '4', name: 'Ben' }
                ],
                selected: [{ id: '4', name: 'Ben' }]
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
            expect(warning).to.include('remove --> item does not exist');
        });

        it('it still performs action on existing items if warning is logged', () => {
            const selector = createSelector([1,2,3], { debug: true });
            selector.remove([1,4]);
            const expectedState = {
                items: [2,3],
                selected: []
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
            expect(err).to.include('remove --> item does not exist');
        });

        it('it does not perform action on existing items if error is logged', () => {
            const selector = createSelector([1,2,3], { strict: true });
            selector.add([1,4]);
            const expectedState = {
                items: [1,2,3],
                selected: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });
    });
});

describe('When filtering items', () => {
    context('with .filter(...) in default mode', () => {
        it('it returns the instance', () => {
            const selector = createSelector();
            const instance = selector.filter(() => true);
            expect(instance).to.equal(selector);
        });

        it('it filter items based on boolean return value of predicate', () => {
            const selector = createSelector([1,2,3,4,5,6]);
            
            selector.filter(item => item.value > 3);
            const expectedState = {
                items: [4,5,6],
                selected: []
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it filter selections based on boolean return value of predicate', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selected: [1,2,3,4]
            });
            
            selector.filter(item => item.value > 3);
            const expectedState = {
                items: [4,5,6],
                selected: [4]
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it restores the selection state when unfiltering items', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selected: [1,2,3,4]
            });
           
            selector
                .filter(item => item.value > 3)
                .filter(item => true); // <- unfilter all!

            const expectedState = {
                items: [1,2,3,4,5,6],
                selected: [1,2,3,4]
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it will provide the value and selected state to predicate function', () => {
            const selector = createSelector([1,2,3,4,5,6]);
            const filter : sinon.SinonSpy = sinon.stub().returns(true);

            selector
                .select(2)
                .filter(filter);
                
            const randomCallArgs = {
                value: 2,
                selected: true,
            }

            expect(filter).to.have.been.calledWithExactly(randomCallArgs)
        });
    });

    context('with .filter(...) in track-by mode', () => {
        it('it will provide the value, selected state and track-by key to predicate function', () => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 
            const selector = createSelector(items, { trackBy: 'id' });
            const filter : sinon.SinonSpy = sinon.stub().returns(true);

            selector
                .select('2')
                .filter(filter);

            const randomCallArgs = {
                value: { id: '2', name: 'Han' },
                selected: true,
                key: '2'
            }

            expect(filter).to.have.been.calledWithExactly(randomCallArgs)
        });
    });

});

describe('When swapping items', () => {
    context('with .swap(...) in default mode', () => {
        it('will replace an item with the one provided', () => {
            const selector = createSelector([1,2,3]);
            selector.select(2).swap(2, 20);
            const expectedState = {
                items: [1,20,3],
                selected: [20] 
            }

            expect(selector.state).to.deep.equal(expectedState);
        });

        it('can also swap objects', () => {
            const han = { id: '2', name: 'Han' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 
            const selector = createSelector(items);
            selector.select(han).swap(han, { id: '2', name: 'Chewie'});
            const expectedState = {
                items: [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Chewie'},
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ],
                selected: [{ id: '2', name: 'Chewie'},] 
            };

            expect(selector.state).to.deep.equal(expectedState);
        });
    });

    context('with .swap(...) in track by mode', () => {
        it('it will swap an existing item for the one provided', () => {
            const han = { id: '2', name: 'Han' };
            const chewie = { id: '2', name: 'Chewie' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 

            const selector = createSelector(items, { trackBy: 'id' });
            selector.swap('2', chewie);

            const expectedState = {
                items: [
                    { id: '1', name: 'Luke' },
                    chewie,
                    { id: '3', name: 'Leia' },
                    { id: '4', name: 'Ben' },
                ],
                selected: [] 
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it will maintain the selection state when swapping an item that is selected', () => {
            const han = { id: '2', name: 'Han' };
            const chewie = { id: '2', name: 'Chewie' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 

            const selector = createSelector(items, { trackBy: 'id' });
            selector.select(han).swap('2', chewie);

            const expectedState = {
                items: [
                    { id: '1', name: 'Luke' },
                    chewie,
                    { id: '3', name: 'Leia' },
                    { id: '4', name: 'Ben' },
                ],
                selected: [chewie] 
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it will be a noop if trying to swap non-existing item', () => {
            const han = { id: '2', name: 'Han' };
            const chewie = { id: '2', name: 'Chewie' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 

            const selector = createSelector(items, { trackBy: 'id' });
            selector.select(han).swap('10', chewie);

            const expectedState = {
                items: [
                    { id: '1', name: 'Luke' },
                    han,
                    { id: '3', name: 'Leia' },
                    { id: '4', name: 'Ben' },
                ],
                selected: [han] 
            }
            expect(selector.state).to.deep.equal(expectedState);
        });

    });

    context('with .swap(...) in debug by mode', () => {
        let warn : sinon.SinonStub;

        beforeEach(() => warn = sinon.stub(console, 'warn'));
        afterEach(() => warn.restore());

        it('it will warn if trying to swap non-existing item', () => {
            const han = { id: '2', name: 'Han' };
            const chewie = { id: '2', name: 'Chewie' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 

            const selector = createSelector(items, { debug: true, trackBy: 'id' });
            selector.select(han).swap('10', chewie);

            const warning = warn.lastCall.args[0];
            expect(warning).to.include('swapping --> item does not exist.');
        });
    });

    context('with .swap(...) in strict by mode', () => {
        let err : sinon.SinonStub;

        beforeEach(() => err = sinon.stub(console, 'error'));
        afterEach(() => err.restore());

        it('it will log an error if trying to swap non-existing item', () => {
            const han = { id: '2', name: 'Han' };
            const chewie = { id: '2', name: 'Chewie' };
            const items = [
                { id: '1', name: 'Luke' },
                han,
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ]; 

            const selector = createSelector(items, { strict: true, trackBy: 'id' });
            selector.select(han).swap('10', chewie);

            const error = err.lastCall.args[0];
            expect(error).to.include('swapping --> item does not exist.');
        });
    });
});