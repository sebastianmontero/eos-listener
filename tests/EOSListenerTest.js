const expect = require('chai').expect
const EOSListener = require('../src/EOSListener');


describe('parse()', function () {
    const listener = new EOSListener('', '', '');

    it('Should return empty object for empty string', function () {
        expect(listener.parse("")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with spaces', function () {
        expect(listener.parse("   ")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with assign operator', function () {
        expect(listener.parse(":")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with assign operator and spaces', function () {
        expect(listener.parse(" : ")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with multiple assign operators', function () {
        expect(listener.parse(":::")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with multiple assign operators', function () {
        expect(listener.parse(" : :  :")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with multiple assign operators', function () {
        expect(listener.parse(" : :  :")).to.be.deep.equal({});
    });

    it('Should return empty object for empty string with multiple assign operators and a final value', function () {
        expect(listener.parse(" : :  :t")).to.be.deep.equal({});
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse("t: :  :")).to.be.deep.equal({ t: '' });
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse(": t:  :")).to.be.deep.equal({ t: '' });
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse(": :  t:")).to.be.deep.equal({ t: '' });
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse(": :  t:")).to.be.deep.equal({ t: '' });
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse(": :  't':")).to.be.deep.equal({ t: '' });
    });

    it('Should return object with one key and value', function () {
        expect(listener.parse(": t: as  :")).to.be.deep.equal({ t: 'as', 'as': '' });
    });

    it('Should return object with on key and empty value', function () {
        expect(listener.parse(": :  t:12")).to.be.deep.equal({ t: '12' });
    });

    it('Should return object with two keyes one with value one empty', function () {
        expect(listener.parse(": k:  v:")).to.be.deep.equal({ k: 'v', v: '' });
    });

    it('Should return object with two keyes two with value', function () {
        expect(listener.parse(": k:  v:v")).to.be.deep.equal({ k: 'v', v: 'v' });
    });

    it('Should parse all key-values 1', function () {
        expect(listener.parse('test:test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test:"test"')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 3', function () {
        expect(listener.parse('"test":"test"')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse("'test':'test'")).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test :test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test: test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('"test" :test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test: "test"')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse("'test' :test")).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse("test: 'test'")).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse(' test:test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test:test ')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse(' "test":test')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('test:"test" ')).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse(" 'test':test")).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse("test:'test' ")).to.be.deep.equal({ test: 'test' });
    });

    it('Should parse all key-values 2', function () {
        expect(listener.parse('type:"buy", amount:"100.0000 DEOS", price:"0.0004 EOS", ta:"thedeosgames", user_type:"taker", k:3112'))
            .to.be.deep.equal({
                type: 'buy',
                amount: '100.0000 DEOS',
                price: '0.0004 EOS',
                ta: 'thedeosgames',
                user_type: 'taker',
                k: '3112'
            });
    });

    it('Should parse all key-values 3', function () {
        expect(listener.parse('"type":"buy", "amount":"100.0000 DEOS", "price":"0.0004 EOS", "ta":"thedeosgames", "user_type":"taker", "k":3112'))
            .to.be.deep.equal({
                type: 'buy',
                amount: '100.0000 DEOS',
                price: '0.0004 EOS',
                ta: 'thedeosgames',
                user_type: 'taker',
                k: '3112'
            });
    });
});