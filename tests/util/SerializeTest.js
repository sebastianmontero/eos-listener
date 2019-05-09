const expect = require('chai').expect
const TraceProgress = require('../../src/eos-listener/TraceProgress');


describe('serialize', function () {

    it('Should return true for empty array', function () {

        let tps = {
            t1: new TraceProgress({ blockNum: 10, actionSeq: 1 }),
            t2: new TraceProgress({ blockNum: 11, actionSeq: 1 }),
            t3: new TraceProgress({ blockNum: 12, actionSeq: 1 }),
        };

        const str = JSON.stringify(tps);
        console.log(str);
        const tps2 = JSON.parse(str);
        console.log(tps);
        console.log(tps2);
        /* tp.shouldProcessBlock({
            blockNum: 10,
            actionSeq: 11
        }); */
    });

});