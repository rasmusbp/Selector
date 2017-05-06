const chai = require('chai');
const sinon : sinon.SinonStatic = require('sinon');
const { expect } : Chai.ChaiStatic = chai;
require('sinon-chai');
chai.use(require('sinon-chai'));

import {createSelector} from '../src/index';

describe('When setting state', () => {
    context('with .setState(...) in default mode', () => {
        it('it returns the instance', () => {
            const selector = createSelector();
            const instance = selector.setState({
                items: [1],
                selected: []
            });
            expect(instance).to.equal(selector);
        });

        it('it can overwrite current state with the one of provided state object', () => {
            const selector = createSelector([1,2,3,4,5]);
            const newState = {
                items: [6,7,8,9,10,11],
                selected: []
            };
            selector.setState(newState);
            expect(selector.state).to.deep.equal(newState);
        });

        it('it can overwrite current selected with the one of provided state object', () => {
            const items = [1,2,3,4,5];
            const selector = createSelector({
                items,
                selected: [3,4]
            });
            const newState = {
                items,
                selected: [1,2]
            };
            selector.setState(newState);
            expect(selector.state.selected).to.deep.equal(newState.selected);
        });

        it('it can overwrite current state with the one of provided array', () => {
            const selector = createSelector({
                items: [1,2,3,4,5],
                selected: [1,2,3]
            });

            selector.setState([6,7,8,9,10,11]);
            
            const expectedState = {
                items: [6,7,8,9,10,11],
                selected: []
            };

            expect(selector.state).to.deep.equal(expectedState);
        });

        it('it will accept functions to determine state', () => {
            const selector = createSelector([1,2,3,4]);

            selector.setState({
                items: (state, initialState) => initialState.items.map(item => item * 10),
                selected: item => item > 20
            });
            const state = selector.state;
            const expectedState = {
                items: [10,20,30,40],
                selected: [30,40]
            };
            expect(state).to.deep.equal(expectedState);
        });

    });

    context('with .setState(...) in track by mode', () => {        
        it('it will accept an array of properties to specify selected', () => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];

            const selector = createSelector<{ id: string, name: string }>({
                items,
                selected: ['1', '2']
            }, { trackBy: 'id' });
            
            const expectedState = {
                items,
                selected: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' }
                ]
            }

            expect(selector.state).deep.equal(expectedState);
        });

        it('it will accept an array of objects containing `trackBy` property to specify selected', () => {
            const items = [
                { id: '1', name: 'Luke' },
                { id: '2', name: 'Han' },
                { id: '3', name: 'Leia' },
                { id: '4', name: 'Ben' },
            ];

            const selector = createSelector({
                items,
                selected: [{ id: '1' }, { id: '2', what: '?' }]
            }, { trackBy: 'id' });
            
            const expectedState = {
                items,
                selected: [
                    { id: '1', name: 'Luke' },
                    { id: '2', name: 'Han' }
                ]
            }

            expect(selector.state).deep.equal(expectedState);
        });
    }); 

    context('with .setState(...) in debug mode', () => {
        let warn : sinon.SinonStub;

        beforeEach(() => warn = sinon.stub(console, 'warn'));
        afterEach(() => warn.restore());
        
        it('it warns if selected is not present in items', () => {
            const selector = createSelector<number>({
                items: [1,2,3,4],
                selected: ['i am not here']
            }, { debug: true });

            const warning = warn.lastCall.args[0];
            expect(warning).to.include('select --> item does not exist');
        });

        it('it still performs action on existing items if warning is logged', () => {
            const selector = createSelector({
                items: [1,2,3,4],
                selected: ['i am not here',2,3]
            }, { debug: true });

            const expectedState = {
                items: [1,2,3,4],
                selected: [2,3]
            };
            expect(selector.state).to.deep.equal(expectedState);
        });

    });

    context('with .setState(...) in strict mode', () => {
        let error : sinon.SinonStub;

        beforeEach(() => error = sinon.stub(console, 'error'));
        afterEach(() => error.restore());

        it('it logs an error if selected is not present in items', () => {
            const selector = createSelector<number>({
                items: [1,2,3,4],
                selected: ['i am not here']
            }, { strict: true });

            const err = error.lastCall.args[0];
            expect(err).to.include('select --> item does not exist');
        });

        it('it does not perform action on existing items if error is logged', () => {
            const selector = createSelector({
                items: [1,2,3,4],
                selected: ['i am not here',2,3]
            }, { strict: true });

            const expectedState = {
                items: [1,2,3,4],
                selected: []
            };
            expect(selector.state).to.deep.equal(expectedState);
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
                selected: [3,4]
            }
            const selector = createSelector(initialState);
            selector
                .setState({
                    items: [10,20,30,40,50],
                    selected: [30,40]
                })
                .setState({
                    items: [11,12,13],
                    selected: [11,12]
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
                selected: [2]
            };
            const selector = createSelector(initialState);
            const state = selector.state;
            expect(state).to.deep.equal(initialState);
        });

        it('it yields a new state on each get', () => {
            const initialState = {
                items: [1,2,3],
                selected: [2]
            };
            const newState = {
                items: [4,5,6],
                selected: [6]
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

        