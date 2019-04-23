const AccountDao = require('./AccountDao');
const ActionDao = require('./ActionDao');
const AuthTokenDao = require('./AuthTokenDao');
const ChannelDao = require('./ChannelDao');
const DappDao = require('./DappDao');
const TokenDao = require('./TokenDao');
const BetDao = require('./BetDao');
const ExchangeTradeDao = require('./ExchangeTradeDao')
const DappTableDao = require('./DappTableDao');
const AccountBalanceDao = require('./AccountBalanceDao');
const BlockProducerDao = require('./BlockProducerDao');
const BlockProducerHistoryDao = require('./BlockProducerHistoryDao');
const VoterDao = require('./VoterDao');
const VoterBlockProducerDao = require('./VoterBlockProducerDao');
const VoterBlockProducerHistoryDao = require('./VoterBlockProducerHistoryDao');
const ActionBlockProgressDao = require('./ActionBlockProgressDao');
const DappTableBlockProgressDao = require('./DappTableBlockProgressDao');
const TransferDao = require('./TransferDao');
const GyftDao = require('./GyftDao');
const TradeDao = require('./TradeDao');
const GyftTokenProjectionDao = require('./GyftTokenProjectionDao');
const OrderBookChangeDao = require('./OrderBookChangeDao');
const OrderBookDao = require('./OrderBookDao');

module.exports = {
    AccountDao,
    ActionDao,
    AuthTokenDao,
    TokenDao,
    ChannelDao,
    DappDao,
    BetDao,
    ExchangeTradeDao,
    DappTableDao,
    AccountBalanceDao,
    BlockProducerDao,
    VoterDao,
    VoterBlockProducerDao,
    BlockProducerHistoryDao,
    VoterBlockProducerHistoryDao,
    ActionBlockProgressDao,
    DappTableBlockProgressDao,
    TransferDao,
    GyftDao,
    TradeDao,
    GyftTokenProjectionDao,
    OrderBookChangeDao,
    OrderBookDao,
};