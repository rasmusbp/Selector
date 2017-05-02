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
    });

});

describe('When validating selections', () => {
    let warn : sinon.SinonStub;

    beforeEach(() => warn = sinon.stub(console, 'warn'));
    afterEach(() => warn.restore());

    context('with .hasSeletions in default mode', () => {
        
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
            const isSelected = selector.isSelected(4);
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
            const isSelected = selector.isSelected(4);
            expect(warn).not.to.have.been.called;
        });
    });
});