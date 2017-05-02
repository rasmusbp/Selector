const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../../src/index';

describe('When validating items', () => {

    context('with .has(...)', () => {
        it('it will return true if provided item exists on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.has(2);
            expect(has).to.be.true;
        });

        it('it will return false if provided item does not exists on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.has(5);
            expect(has).to.be.false;
        });

        it('it will return true if all items of provided array exist on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.has([1,3]);
            expect(has).to.be.true;
        });

        it('it will return false if some items of provided array does not exist on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.has([1,2,3,4]);
            expect(has).to.be.false;
        });

        it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector([1,2,3,4,5,6]);
            const has = selector.has(item => item > 7);
            expect(has).to.be.false;
        });
    });

     context('with .has(...) in track by mode', () => {
        let selector;
        beforeEach(() => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];
            selector = createSelector(items, { trackBy: 'id' });
        });

        it('will accept a single property to determine result', () => {
            const has = selector.has('1');
            expect(has).to.be.true;
        });

        it('will accept an array of properties to determine result', () => {
            const has = selector.has(['1','2','6']);
            expect(has).to.be.false;
        });
    });

    context('with .hasSome(...)', () => {
        it('it will return true if provided item exists on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.hasSome(2);
            expect(has).to.be.true;
        });

        it('it will return false if provided item does not exists on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.hasSome(5);
            expect(has).to.be.false;
        });

        it('it will return true if all items of provided array exist on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.hasSome([1,3]);
            expect(has).to.be.true;
        });

        it('it will return true if some items of provided array exist on state object', () => {
            const selector = createSelector([1,2,3]);
            const has = selector.hasSome([1,2,4,5]);
            expect(has).to.be.true;
        });

        it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector([1,2,3,4,5,6]);
            const has = selector.hasSome(item => item > 4);
            expect(has).to.be.true;
        });
    });

    context('with .hasSome(...) in track by mode', () => {
        let selector;
        beforeEach(() => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];
            selector = createSelector(items, { trackBy: 'id' });
        });

        it('will accept a single property to determine result', () => {
            const has = selector.hasSome('1');
            expect(has).to.be.true;
        });

        it('will accept an array of properties to determine result', () => {
            const has = selector.hasSome(['1','2','5']);
            expect(has).to.be.true;
        });
    });

});

describe('When validating selections', () => {
    let warn : sinon.SinonStub;

    beforeEach(() => warn = sinon.stub(console, 'warn'));
    afterEach(() => warn.restore());

    context('with .hasSelections in default mode', () => {
        it('it will return true if state has selections', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            expect(selector.hasSelections).to.be.true;
        });

        it('it will return false if state has no selections', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: []
            });
            expect(selector.hasSelections).to.be.false;
        });
    });

    context('with .isAllSelected in default mode', () => {
        it('it will return true if all items are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [1,2,3]
            });
            expect(selector.isAllSelected).to.be.true;
        });

        it('it will return false if not all items are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2,3]
            });
            expect(selector.isAllSelected).to.be.false;
        });
    });

    context('with .isSelected(...) in default mode', () => {
        it('it will return true if provided item is selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            const isSelected = selector.isSelected(2);
            expect(isSelected).to.be.true;
        });

        it('it will return false if provided item is not selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            const isSelected = selector.isSelected(2);
            expect(isSelected).to.be.false;
        });

        it('it will return true if all items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2,3]
            });
            const isSelected = selector.isSelected([2,3]);
            expect(isSelected).to.be.true;
        });

         it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selections: [1,2,3]
            });
            const isSelected = selector.isSelected(item => item < 4);
            expect(isSelected).to.be.true;
        });

        it('it will return false if not all items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2,3]
            });
            const isSelected = selector.isSelected([1,2,3]);
            expect(isSelected).to.be.false;
        });

        it('it warns if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            selector.isSelected(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('isSelected --> item does not exist');
        });
    });

    context('with .isSelected(...) in non-strict mode', () => {
        it('it will not warn if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            }, { strict: false });
            selector.isSelected(4);
            expect(warn).not.to.have.been.called;
        });
    });

    context('with .isSelected(...) in track by mode', () => {
        let selector;
        beforeEach(() => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];
            selector = createSelector({
                items,
                selections: ['1','2']
            }, { trackBy: 'id' });
        });

        it('will accept a single property to determine result', () => {
            const isSelected = selector.isSelected('2');
            expect(isSelected).to.be.true;
        });

        it('will accept an array of properties to determine result', () => {
            const isSelected = selector.isSelected(['1','2']);
            expect(isSelected).to.be.true;
        });
    });

    context('with .isSomeSelected(...) in default mode', () => {
        it('it will return true if provided item is selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            const isSomeSelected = selector.isSomeSelected(2);
            expect(isSomeSelected).to.be.true;
        });

        it('it will return false if provided item is not selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            const isSomeSelected = selector.isSomeSelected(2);
            expect(isSomeSelected).to.be.false;
        });

        it('it will return true if some items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            const isSomeSelected = selector.isSomeSelected([2,3]);
            expect(isSomeSelected).to.be.true;
        });

        it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selections: [1,2,3]
            });
            const isSomeSelected = selector.isSomeSelected(item => item < 2);
            expect(isSomeSelected).to.be.true;
        });

        it('it will return false if non of the items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [1]
            });
            const isSomeSelected = selector.isSomeSelected([2,3]);
            expect(isSomeSelected).to.be.false;
        });

        it('it warns if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            selector.isSomeSelected(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('isSomeSelected --> item does not exist');
        });
    });

    context('with .isSomeSelected(...) in non-strict mode', () => {
        it('it will not warn if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            }, { strict: false });
            selector.isSomeSelected(4);
            expect(warn).not.to.have.been.called;
        });
    });

     context('with .isSomeSelected(...) in track by mode', () => {
        let selector;
        beforeEach(() => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];
            selector = createSelector({
                items,
                selections: ['1','2','3']
            }, { trackBy: 'id' });
        });

        it('will accept a single property to determine result', () => {
            const isSomeSelected = selector.isSomeSelected('1');
            expect(isSomeSelected).to.be.true;
        });

        it('will accept an array of properties to determine result', () => {
            const isSomeSelected = selector.isSomeSelected(['1','2']);
            expect(isSomeSelected).to.be.true;
        });
    });


    context('with .isOnlySelected(...) in default mode', () => {
        it('it will return true if provided item is selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            const isOnlySelected = selector.isOnlySelected(2);
            expect(isOnlySelected).to.be.true;
        });

        it('it will return false if provided item is not selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            const isOnlySelected = selector.isOnlySelected(2);
            expect(isOnlySelected).to.be.false;
        });

        it('it will return true if only items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [2,3]
            });
            const isOnlySelected = selector.isOnlySelected([2,3]);
            expect(isOnlySelected).to.be.true;
        });

         it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selections: [1]
            });
            const isOnlySelected = selector.isOnlySelected(item => item === 1);
            expect(isOnlySelected).to.be.true;
        });

        it('it will return false if more items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [1,2,3]
            });
            const isOnlySelected = selector.isOnlySelected([2,3]);
            expect(isOnlySelected).to.be.false;
        });

        it('it warns if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            });
            selector.isOnlySelected(4);

            const warning = warn.args[0][0];
            expect(warning).to.include('isOnlySelected --> item does not exist');
        });
    });

    context('with .isOnlySelected(...) in non-strict mode', () => {
        it('it will not warn if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selections: [3]
            }, { strict: false });
            selector.isOnlySelected(4);
            expect(warn).not.to.have.been.called;
        });
    });

    context('with .isOnlySelected(...) in track by mode', () => {
        let selector;
        beforeEach(() => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];
            selector = createSelector({
                items,
                selections: ['1','2']
            }, { trackBy: 'id' });
        });

        it('will accept a single property to determine result', () => {
            const isOnlySelected = selector.isOnlySelected('1');
            expect(isOnlySelected).to.be.false;
        });

        it('will accept an array of properties to determine result', () => {
            const isOnlySelected = selector.isOnlySelected(['1','2']);
            expect(isOnlySelected).to.be.true;
        });
    });

});
