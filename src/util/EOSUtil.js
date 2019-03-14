const { General } = require('../const');


class EOSUtil {
    static normalizeStaked(amount) {
        return amount / General.STAKED_MULTIPLIER;
    }
}

module.exports = EOSUtil;