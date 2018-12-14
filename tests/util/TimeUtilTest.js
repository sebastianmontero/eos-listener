const expect = require('chai').expect
const TimeUtil = require('../../src/util/TimeUtil');


describe('toUTCDateTimeNTZString()', function () {

    it('Should return zero padded value', function () {
        expect(TimeUtil.toUTCDateTimeNTZString(new Date('2018-01-02T09:08:01.500Z'))).to.be.deep.equal('2018-01-02 09:08:01.500');
    });

    it('Should return no zero pad required', function () {
        expect(TimeUtil.toUTCDateTimeNTZString(new Date('2018-11-12T19:18:11.500Z'))).to.be.deep.equal('2018-11-12 19:18:11.500');
    });

});