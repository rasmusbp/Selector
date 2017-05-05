const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../src/index';

describe('When subscribing to state changes', () => {
    context('with .subscribe(...) in default mode', () => {
        it('it will notify on changes', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            selector.subscribe(observer);

            selector
                .add(1)
                .select(1)
                .deSelect(1)
                .remove(1);

            expect(observer).to.have.callCount(4);
        });

        it('it will also notify on invalid changes with result of successful changes', () => {
            const selector = createSelector([1]);
            const observer = sinon.stub();
            selector.subscribe(observer);

            selector.add([1,2]);

            const expectedChange = {
                add: [2],
                select: [],
                deselect: [],
                remove: []
            }

            expect(observer).to.have.been.calledWithExactly(expectedChange, selector.state, selector);
        });

        it('it will also notify error observer on invalid changes with unsuccessful changes', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            const errorObserver = sinon.stub();
            selector.subscribe(observer, errorObserver);

            selector.add(1).select(1).add(1);

            const mockErrors = [{
                message: 'Selector@add --> item already exist.',
                reason: 'ALREADY_EXIST',
                data: 1
            }];

           expect(errorObserver).to.have.been.calledWithExactly(mockErrors, selector.state, selector);
        });

        it('it will not notify on non-mutations', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            selector.subscribe(observer);

            selector.has(1);
            selector.isSelected(1);

            expect(observer).to.have.callCount(0);
        });

        it('it will not notify on redundant changes', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            selector.subscribe(observer);

            selector
                .add(1).add(1).add(1).add(1)    // <- 1 state change
                .select(1).select(1)            // <- 1 state change
                .remove(1).remove(1)            // <- 1 state change
                .deSelect(1);                   // <- 0 state changes

            expect(observer).to.have.callCount(3);
        });

        it('it can notify multiple observers', () => {
            const selector = createSelector();
            const observers = new Array(10).fill(0).map(() => sinon.stub());

            // register 10 observers
            observers.forEach(observer => selector.subscribe(observer));
            
            selector
                .add(1)
                .select(1);

            const hasAllBeenCalledTwice = observers.every(observer => observer.callCount === 2);

            expect(hasAllBeenCalledTwice).to.be.true;
        });
        
        it('it will only dispatch one change on a bulk action', () => {
            const selector = createSelector({
                items: [1,2,3,4,5],
                selected: [1,2]
            });
            const observer = sinon.stub();
            selector.subscribe(observer);

            selector
                .applyChange({
                    add: [10,20,30,40,50],
                    select: [10,20,3,4],
                    deselect: [1,2],
                    remove: [5]
                });

            expect(observer).to.have.callCount(1);
        });

        it('it will return an unsubsribe function', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            const errorObserver = sinon.stub();
            const unsubsriber = selector.subscribe(observer, errorObserver);

            selector.add(1).add(1);
            unsubsriber();
            selector.add(2).add(2);

            expect(observer).to.have.callCount(1);
            expect(errorObserver).to.have.callCount(1);

        });
        
        it('it will provide changes, state and instance as arguments to the observer', () => {
            const selector = createSelector();
            const observer = sinon.stub();
            selector.subscribe(observer);
            selector.add(1);
            const change = {
                add: [1],
                select: [],
                deselect: [],
                remove: []
            }

            expect(observer).to.have.been.calledWithMatch(change, selector.state, selector);
        });
    });

    context('with .subscribe(...) in strict mode', () => {
        let error : sinon.SinonStub;

        beforeEach(() => error = sinon.stub(console, 'error'));
        afterEach(() => error.restore());

        context('on valid changes', () => {
            it('it will notify default observer', () => {
                const selector = createSelector([], { strict: true });
                const observer = sinon.stub();
                selector.subscribe(observer);

                selector.add(1)

                expect(observer).to.have.callCount(1);
            });

            it('it will not notify error observer', () => {
                const selector = createSelector([], { strict: true });
                const observer = sinon.stub();
                const errorObserver = sinon.stub();
                selector.subscribe(observer, errorObserver);

                selector.add(1);

                expect(errorObserver).to.have.callCount(0);
            });
        });

        context('on invalid changes', () => {
            it('it will notify error observer', () => {
                const selector = createSelector([1], { strict: true });
                const observer = sinon.stub();
                const errorObserver = sinon.stub();
                selector.subscribe(observer, errorObserver);

                selector.add(1);

                expect(errorObserver).to.have.callCount(1);
            });

            it('it will not notify default observer', () => {
                const selector = createSelector([1], { strict: true });
                const observer = sinon.stub();
                selector.subscribe(observer);

                selector.add([1,2]);

                expect(observer).to.have.callCount(0);
            });

            it('it will provide errors, state and instance as arguments to the error observer', () => {
                const selector = createSelector({
                    items: [1,2],
                    selected: [2]
                }, { strict: true });

                const observer = sinon.stub();
                const errorObserver = sinon.stub();
                selector.subscribe(observer, errorObserver);

                selector.applyChange({
                    add: [1],
                    select: [2],
                    deselect: [],
                    remove: []
                });

                const mockErrors = [{
                    message: 'Selector@add --> item already exist.',
                    reason: 'ALREADY_EXIST',
                    data: 1
                }, {
                    message: 'Selector@select --> item is already selected.',
                    reason: 'ALREADY_SELECTED',
                    data: 2
                }];

                expect(errorObserver).to.have.been.calledWithExactly(mockErrors, selector.state, selector);
            });
        });

    });
});