const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../../src/index';

describe('When setting state', () => {
    let warn : sinon.SinonStub;

    beforeEach(() => warn = sinon.stub(console, 'warn'));
    afterEach(() => warn.restore());

    context('with .setState(...) in default mode', () => {
        it('it returns the instance', () => {
            const selector = createSelector();
            const instance = selector.setState([1]);
            expect(instance).to.equal(selector);
        });

        it('it can overwrite current state items with the one of provided array', () => {
            const selector = createSelector([1,2,3,4,5]);
            const newItems = [6,7,8,9,10];
            selector.setState(newItems);
            const expectedState = {
                items: [6,7,8,9,10],
                selections: []
            };
            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it can overwrite current state with the one of provided state object', () => {
            const selector = createSelector([1,2,3,4,5]);
            const newState = {
                items: [6,7,8,9,10,11],
                selections: []
            };
            selector.setState(newState);
            expect(selector.state).to.deep.equal(newState);
        });

        it('it can overwrite current selections with the one of provided state object', () => {
            const items = [1,2,3,4,5];
            const selector = createSelector({
                items,
                selections: [3,4]
            });
            const newState = {
                items,
                selections: [1,2]
            };
            selector.setState(newState);
            expect(selector.state.selections).to.deep.equal(newState.selections);
        });

        it('it will throw if passed invalid state object', () => {
            const selector = createSelector();
            const invalid_1 = {};
            const invalid_2 = { items: [] };
            const invalid_3 = { selections: [] };
            const invalid_4 = { items: 'what?!', selections: [] };
            const invalid_5 = null;
            const error = /provided state is not valid/;
            const setStateWith = state => () => selector.setState(state);

            expect(setStateWith(invalid_1)).to.throw(error);
            expect(setStateWith(invalid_2)).to.throw(error);
            expect(setStateWith(invalid_3)).to.throw(error);
            expect(setStateWith(invalid_4)).to.throw(error);
            expect(setStateWith(invalid_5)).to.throw(error);
        });

        it('it warns if selections is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3,4],
                selections: ['i am not here']
            });
            const warning = warn.lastCall.args[0];
            expect(warning).to.include('setState --> item does not exist');
        });
    });

    context('with .setState(...) in non-strict mode', () => {
        it('it will not warn if selections is not present in items', () => {
            const selector = createSelector({
                items: [1,2,3,4],
                selections: ['i am not here']
            }, {
                strict: false
            });
            expect(warn).not.to.have.been.called;
        });
    }); 

    context('with .setState(...) in track by mode', () => {        
        it('it will accept an array of properties to specify selections', () => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];

            const selector = createSelector({
                items,
                selections: ['1', '2']
            }, { trackBy: 'id' });
            
            const expectedState = {
                items,
                selections: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' }
                ]
            }

            expect(selector.state).deep.equal(expectedState);
        });

        it('it will accept an array of objects containing `trackBy` property to specify selections', () => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];

            const selector = createSelector({
                items,
                selections: [{ id: '1' }, { id: '2', what: '?' }]
            }, { trackBy: 'id' });
            
            const expectedState = {
                items,
                selections: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' }
                ]
            }

            expect(selector.state).deep.equal(expectedState);
        });
    }); 

    context('with .reset()', () => {
        it('it returns the instance', () => {
            const selector = createSelector();
            const instance = selector.reset();
            expect(instance).to.equal(selector);
        });

        it('it resets to state passed at construction', () => {
            const initialState = {
                items: [1,2,3,4,5],
                selections: [3,4]
            }
            const selector = createSelector(initialState);
            selector
                .setState([6,7,8,9,10])
                .setState([])
                .setState({
                    items: [11,12,13],
                    selections: [11,12]
                })
                .reset();

            expect(selector.state).to.deep.equal(initialState);
        });
    });
});

describe('When getting state', () => {
    context('with .state', () => {
        it('it yields the current state', () => {
            const initialState = {
                items: [1,2,3],
                selections: [2]
            };
            const selector = createSelector(initialState);
            const state = selector.state;
            expect(state).to.deep.equal(initialState);
        });

        it('it yields a new state on each get', () => {
            const initialState = {
                items: [1,2,3],
                selections: [2]
            };
            const newState = {
                items: [4,5,6],
                selections: [6]
            }
            const selector = createSelector(initialState);
            const state_1 = selector.state;

            selector.setState(newState);
            const state_2 = selector.state;

            expect(state_1).to.deep.equal(initialState);
            expect(state_2).to.deep.equal(newState);
        });
    });
});

        