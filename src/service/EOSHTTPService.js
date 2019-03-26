const Fetch = require('./FetchService');
const { eoswsEndpoint } = require('config');
const { TimeUtil, EOSUtil } = require('../util');

class EOSHTTPService {

    static async getDailyBlockNumbers(numDaysBack) {
        const blockInfo = await Fetch.json(`https://${eoswsEndpoint}/v1/chain/get_info`);
        const { head_block_num: blockNum, head_block_time: blockTimeStr } = blockInfo;
        let blockTime = TimeUtil.toUTCDateFromNTZString(blockTimeStr);
        let middayDate = new Date(blockTime);
        middayDate.setUTCHours(12, 0, 0, 0);
        const diff = TimeUtil.secondsDiff(middayDate, blockTime);
        let dayBlockNum = blockNum + (diff * 2);
        if (diff > 0) {
            middayDate = TimeUtil.addDays(middayDate, -1);
            dayBlockNum -= EOSUtil.blocksPerDay;
        }

        let blockNumbers = [];

        for (let i = 0; i < numDaysBack; i++) {
            blockNumbers.unshift({
                blockNum: dayBlockNum,
                blockDate: middayDate
            });
            dayBlockNum -= EOSUtil.blocksPerDay;
            middayDate = TimeUtil.addDays(middayDate, -1);
        }
        return blockNumbers;

    }
}

module.exports = EOSHTTPService;