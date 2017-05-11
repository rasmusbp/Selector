const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../src/index';

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
            const has = selector.has(item => item.value > 7);
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

});

describe('When validating selected', () => {
    context('with .isSelected(...) in default mode', () => {
        it('it will return true if provided item is selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [2]
            });
            const isSelected = selector.isSelected(2);
            expect(isSelected).to.be.true;
        });

        it('it will return false if provided item is not selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [3]
            });
            const isSelected = selector.isSelected(2);
            expect(isSelected).to.be.false;
        });

        it('it will return true if all items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [2,3]
            });
            const isSelected = selector.isSelected([2,3]);
            expect(isSelected).to.be.true;
        });

         it('it will accept a function as predicate to determine result', () => {
            const selector = createSelector({
                items: [1,2,3,4,5,6],
                selected: [1,2,3]
            });
            const isSelected = selector.isSelected(item => item.value < 4);
            expect(isSelected).to.be.true;
        });

        it('it will return false if not all items of provided array are selected', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [2,3]
            });
            const isSelected = selector.isSelected([1,2,3]);
            expect(isSelected).to.be.false;
        });
    });

    context('with .isSelected(...) in debug mode', () => {
        let warn : sinon.SinonStub;
        let log : sinon.SinonStub;

        beforeEach(() => {
            warn = sinon.stub(console, 'warn')
            log = sinon.stub(console, 'log') // to silence the reporter
        });
        afterEach(() => {
            warn.restore()
            log.restore() // to silence the reporter
        });

        it('it warns if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [3]
            }, { debug: true });
            selector.isSelected(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('isSelected --> item does not exist');
        });
    });

    context('with .isSelected(...) in strict mode', () => {
        let warn : sinon.SinonStub;
        let log : sinon.SinonStub;

        beforeEach(() => {
            warn = sinon.stub(console, 'warn')
            log = sinon.stub(console, 'log') // to silence the reporter
        });
        afterEach(() => {
            warn.restore()
            log.restore() // to silence the reporter
        });

        it('it warns if provided item is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3],
                selected: [3]
            }, { strict: true });
            selector.isSelected(4);
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('isSelected --> item does not exist');
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
            selector = createSelector<{ id: string, name: string }>({
                items,
                selected: ['1','2']
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

});

describe('When validating state', () => {
    context('with .isValid', () => {
        it('it should be true per default', () => {
            const selector = createSelector();
            expect(selector.isValid).to.be.true;
        });

        it('it should yield the validity based on validators provided at construction', () => {
            const selector = createSelector([1,2,3,4], {
                validators: [
                    (state, selector) => selector.has([1,2,3,4]),
                    (state, selector) => selector.some(item => {
                        return item.value === 1 && !!item.selected;
                    })
                ]
            });
   
            expect(selector.isValid).to.be.false;

            selector.select(1);
            expect(selector.isValid).to.be.true;

            selector.remove([1,2,3,4]);
            expect(selector.isValid).to.be.false;

        });
    });
});
