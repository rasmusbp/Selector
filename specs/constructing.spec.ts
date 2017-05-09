const { expect } : Chai.ChaiStatic = require('chai');
import {createSelector} from '../src/index';

describe('Given constructing a Selector instance', () => {

    it('it exposes expected methods', () => {
        const selector = createSelector();
        const methods = [
            'add',
            'select',
            'remove',
            'deselect',
            'applyChange',
            'invert',
            'filter',
            'some',
            'every',
            'has',
            'isSelected',
            'reset',
            'setState',
            'subscribe',
            'swap',
            'toggle'
        ].forEach(method => {
            expect(selector).to.respondTo(method);
        })
    });

    it('it exposes expected getters', () => {
        const selector = createSelector();
        const getters = [
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
                selected: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with an empty array', () => {
            const selector = createSelector([]);
            const initialState = {
                items: [],
                selected: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with a populated array', () => {
            const initialState = {
                items: [1,2,3],
                selected: []
            };
            const selector = createSelector([1,2,3]);
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with predetermined selected', () => {
            const initialState = {
                items: [1,2,3],
                selected: [2]
            };
            const selector = createSelector({
                items: [1,2,3],
                selected: [2]
            });
            expect(selector.state).to.deep.equal(initialState);
        });

        it('it can be constructed with functions to determine state', () => {
            const selector = createSelector({
                items: () => [1,2,3,4],
                selected: item => item.value > 2
            });

            const state = selector.state;
            const expectedState = {
                items: [1,2,3,4],
                selected: [3,4]
            };
            expect(state).to.deep.equal(expectedState);
        });
    });

    context('with configuration', () => {
        it('it can be constructed with a config object', () => {
            const selector = createSelector([1,2,3], {});
            const initialState = {
                items: [1,2,3],
                selected: []
            };
            expect(selector.state).to.deep.equal(initialState);
        });
    });
});
