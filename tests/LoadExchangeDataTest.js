const expect = require('chai').expect
const LoadExchangeData = require('../src/LoadExchangeData');
const config = require('config');

describe('postProcessParsedMemo(parsedMemo)', function () {
    const loader = new LoadExchangeData(config);

    it('Should not fail for null object', function () {
        let parsedMemo = null;
        loader.postProcessParsedMemo(parsedMemo);
    });


    it('Should not modify object for empty object ', function () {
        let parsedMemo = {};
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({});
    });

    it('Should not modify object for values without symbol ', function () {
        let parsedMemo = {
            trade_quantity: '10.000',
            trade_price: '0.0004',
        };
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({
            trade_quantity: '10.000',
            trade_price: '0.0004',
        });
    });

    it('Should add symbol to object for quantity with symbol ', function () {
        let parsedMemo = {
            trade_quantity: '10.000EOS',
            trade_price: '0.0004',
        };
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({
            trade_quantity: '10.000',
            trade_price: '0.0004',
            symbol: 'EOS',
        });
    });

    it('Should add symbol to object for price with symbol ', function () {
        let parsedMemo = {
            trade_quantity: '10.000',
            trade_price: '0.0004 DICE',
        };
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({
            trade_quantity: '10.000',
            trade_price: '0.0004',
            symbol: 'DICE',
        });
    });

    it('Should add symbol to object for price and quantity with symbol ', function () {
        let parsedMemo = {
            trade_quantity: '10.000  EOS ',
            trade_price: '0.0004 DICE ',
        };
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({
            trade_quantity: '10.000',
            trade_price: '0.0004',
            symbol: 'EOS_DICE',
        });
    });

    it('Should not add symbol to object for price and quantity with symbol but symbol already defined ', function () {
        let parsedMemo = {
            trade_quantity: '10.000  EOS ',
            trade_price: '0.0004 DICE ',
            symbol: 'SYMBOL'
        };
        loader.postProcessParsedMemo(parsedMemo);
        expect(parsedMemo).to.be.deep.equal({
            trade_quantity: '10.000',
            trade_price: '0.0004',
            symbol: 'SYMBOL',
        });
    });
});