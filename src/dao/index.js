const AccountDao = require('./AccountDao');
const ActionDao = require('./ActionDao');
const ChannelDao = require('./ChannelDao');
const DappDao = require('./DappDao');
const TokenDao = require('./TokenDao');
const BetDao = require('./BetDao');
const ExchangeTradeDao = require('./ExchangeTradeDao')
const DappTableDao = require('./DappTableDao');
const AccountBalanceDao = require('./AccountBalanceDao');
const BlockProducerDao = require('./BlockProducerDao');

module.exports = {
    AccountDao,
    ActionDao,
    TokenDao,
    ChannelDao,
    DappDao,
    BetDao,
    ExchangeTradeDao,
    DappTableDao,
    AccountBalanceDao,
    BlockProducerDao
};