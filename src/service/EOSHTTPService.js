const Fetch = require('./FetchService');
const { eoswsEndpoint } = require('config');
const { TimeUtil, EOSUtil } = require('../util');

class EOSHTTPService {

    static async getDailyBlockNumbers(startDate, endDate) {
        const now = new Date();
        let lastDate = TimeUtil.toUTCMidday(now);
        lastDate = lastDate > now ? TimeUtil.addDays(lastDate, -1) : lastDate;
        endDate = endDate || lastDate;
        endDate = endDate > lastDate ? lastDate : endDate;
        startDate = TimeUtil.toUTCMidday(startDate);
        endDate = TimeUtil.toUTCMidday(endDate);
        if (startDate > endDate) {
            throw new Error('End date should be greater than start date');
        }
        //const blockInfo = await Fetch.json(`https://${eoswsEndpoint}/v1/chain/get_info`);
        //const { head_block_num: blockNum, head_block_time: blockTimeStr } = blockInfo;
        const blockNum = 68973000;
        const blockTime = new Date(1563278565 * 1000);
        const diff = TimeUtil.secondsDiff(startDate, blockTime);
        let dayBlockNum = blockNum + (diff * 2);

        let blockNumbers = [];
        let date = startDate;
        while (date <= endDate) {
            blockNumbers.push({
                blockNum: dayBlockNum,
                blockDate: date
            });
            dayBlockNum += EOSUtil.blocksPerDay;
            date = TimeUtil.addDays(date, 1);
        }
        return blockNumbers;

    }
}

module.exports = EOSHTTPService;