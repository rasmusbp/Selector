const { expect } : Chai.ChaiStatic = require('chai');
import {createSelector} from '../src/index';

describe('Given constructing a Selector instance', () => {

    it('it exposes expected methods', () => {
        const selector = createSelector();
        const methods = [
            'add',
            'bulk',
            'deSelect',
            'deSelectAll',
            'has',
            'hasSome',
            'invert',
            'isOnlySelected',
            'isSelected',
            'remove',
            'removeAll',
            'reset',
            'select',
            'selectAll',
            'setState',
            'subscribe',
            'swap',
            'toggle',
            'undoLast',
            'unsubscribeAll'
        ].forEach(method => {
            expect(selector).to.respondTo(method);
        })
    });

    it('it exposes expected getters', () => {
        const selector = createSelector();
        const getters = [
            'hasItems',
            'hasSelections',
            'isAllSelected',
            'isValid',
            'state'
        ].forEach(getter => {
            expect(selector[getter])
                .to.not.be.undefined
                .and.to.not.be.a('function');
        })
    });


    context('with initial state', () => {
        it('it can be constructed with no arguments', () => {
            const selector = createSelector();
            const initialState = {
                items: [],
                selections: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with an empty array', () => {
            const selector = createSelector([]);
            const initialState = {
                items: [],
                selections: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with a populated array', () => {
            const initialState = {
                items: [1,2,3],
                selections: []
            };
            const selector = createSelector([1,2,3]);
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with predetermined selections', () => {
            const initialState = {
                items: [1,2,3],
                selections: [2]
            };
            const selector = createSelector({
                items: [1,2,3],
                selections: [2]
            });
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it will throw if passed invalid state object', () => {
            const invalid_1 = {};
            const invalid_2 = { items: [] };
            const invalid_3 = { selections: [] };
            const invalid_4 = { items: 'what?!', selections: [] };
            const invalid_5 = null;
            const error = /provided state is not valid/;
            const createWith = state => () => createSelector(state);

            expect(createWith(invalid_1)).to.throw(error);
            expect(createWith(invalid_2)).to.throw(error);
            expect(createWith(invalid_3)).to.throw(error);
            expect(createWith(invalid_4)).to.throw(error);
            expect(createWith(invalid_5)).to.throw(error);
        });

    });

    context('with configuration', () => {
        it('it can be constructed with a config object', () => {
            const selector = createSelector([1,2,3], {});
            const initialState = {
                items: [1,2,3],
                selections: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });
    });
});
