const { General } = require('../const');

class EOSUtil {

    static normalizeStaked(amount) {
        return amount / General.STAKED_MULTIPLIER;
    }
}

EOSUtil.blocksPerDay = (2 * 60 * 60 * 24);

module.exports = EOSUtil;