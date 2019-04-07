const { ActionDao } = require('./dao');

class ListenerConfig {

    constructor(dbCon) {
        this.actionDao = new ActionDao(dbCon);
    }

    async getActionListener(accountName, actionNames, opts, streamOpts) {

        opts = opts || {};
        streamOpts = streamOpts || {};

        var actions = await this.actionDao.selectByAccountNameAndActionNamesWithProgress(accountName, actionNames);

        let actionTraces = [];
        for (let action of actions) {
            actionTraces.push({
                actionId: action.action_id,
                codeAccountId: action.account_id,
                account: action.account_name,
                action_name: action.action_name,
                with_inline_traces: true,
                streamOptions: {
                    with_progress: 5000,
                    ...streamOpts,
                },
                blockProgress: action.block_progress,
                ...opts,
            });
        }
        return [{
            actionTraces,
            actionFilters: []
        }];
    }

}

module.exports = ListenerConfig;