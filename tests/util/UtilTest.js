const expect = require('chai').expect
const Util = require('../../src/util/Util');


describe('areArraysEqual()', function () {

    it('Should return true for empty array', function () {
        expect(Util.areArraysEqual([], [])).to.be.true;
    });

    it('Should return true for arrays with same elements, same order', function () {
        expect(Util.areArraysEqual([1], [1])).to.be.true;
        expect(Util.areArraysEqual([1, 2], [1, 2])).to.be.true;
        expect(Util.areArraysEqual([4, 1, 5], [4, 1, 5])).to.be.true;
        expect(Util.areArraysEqual(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).to.be.true;
    });

    it('Should return true for arrays with same elements, different order', function () {
        expect(Util.areArraysEqual([1, 2], [2, 1])).to.be.true;
        expect(Util.areArraysEqual([4, 5, 1], [4, 1, 5])).to.be.true;
        expect(Util.areArraysEqual(['a', 'd', 'c', 'b'], ['a', 'b', 'c', 'd'])).to.be.true;
    });

    it('Should return false for arrays with different elements', function () {
        expect(Util.areArraysEqual([1], [])).to.be.false;
        expect(Util.areArraysEqual([1, 2], [2, 1, 3])).to.be.false;
        expect(Util.areArraysEqual([4, 5, 1], [4, 5])).to.be.false;
        expect(Util.areArraysEqual(['a', 'd', 'c', 'b'], ['a', 'b', 'c'])).to.be.false;
    });

});


describe('areEqual()', function () {

    it('Should return false for one null value', function () {
        expect(Util.areEqual(1, null)).to.be.false;
        expect(Util.areEqual(0, null)).to.be.false;
        expect(Util.areEqual(0, undefined)).to.be.false;
    });

    it('Should return true for numbers', function () {
        expect(Util.areEqual(1, 1)).to.be.true;
        expect(Util.areEqual(4, 4)).to.be.true;
        expect(Util.areEqual(2, 2)).to.be.true;
    });

    it('Should return false for different numbers', function () {
        expect(Util.areEqual(1, 2)).to.be.false;
        expect(Util.areEqual(4, -1)).to.be.false;
        expect(Util.areEqual(2, 3)).to.be.false;
    });

    it('Should return true for strings', function () {
        expect(Util.areEqual('hola', 'hola')).to.be.true;
        expect(Util.areEqual('', '')).to.be.true;
        expect(Util.areEqual('adios', 'adios')).to.be.true;
    });

    it('Should return false for different strings', function () {
        expect(Util.areEqual('hola', 'hhola')).to.be.false;
        expect(Util.areEqual('', '1')).to.be.false;
        expect(Util.areEqual('adios', 'adios ')).to.be.false;
    });

    it('Should return true for empty array', function () {
        expect(Util.areEqual([], [])).to.be.true;
    });

    it('Should return true for arrays with same elements, same order', function () {
        expect(Util.areEqual([1], [1])).to.be.true;
        expect(Util.areEqual([1, 2], [1, 2])).to.be.true;
        expect(Util.areEqual([4, 1, 5], [4, 1, 5])).to.be.true;
        expect(Util.areEqual(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).to.be.true;
    });

    it('Should return true for arrays with same elements, different order', function () {
        expect(Util.areEqual([1, 2], [2, 1])).to.be.false;
        expect(Util.areEqual([4, 5, 1], [4, 1, 5])).to.be.false;
        expect(Util.areEqual(['a', 'd', 'c', 'b'], ['a', 'b', 'c', 'd'])).to.be.false;
    });

    it('Should return false for arrays with different elements', function () {
        expect(Util.areEqual([1], [])).to.be.false;
        expect(Util.areEqual([1, 2], [2, 1, 3])).to.be.false;
        expect(Util.areEqual([4, 5, 1], [4, 5])).to.be.false;
        expect(Util.areEqual(['a', 'd', 'c', 'b'], ['a', 'b', 'c'])).to.be.false;
    });

});