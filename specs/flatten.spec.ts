const { expect } : Chai.ChaiStatic = require('chai');
import flatten from '../src/flatten';

describe('utils#flatten', () => {
    
    it('is a function', () => {
        expect(flatten).to.be.a('function');
    });

    it('flattens a deeply nested array', () => {
        const deep = [1, [2], [[3]], [[[4],5,6]], [[[[[[[7]]], 8]]]], [[[[[[[[[[[[[[[9]]]]]]]]]]]]]]]];
        expect(flatten(deep)).to.deep.equal([1,2,3,4,5,6,7,8,9]);
    });

    it('it wraps a non-array value', () => {
        const notArray  = 1;
        expect(flatten(1)).to.deep.equal([1]);
    });

});