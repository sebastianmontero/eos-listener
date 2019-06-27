#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node TradeActionTopology.js > ../logs/trade-action-topology-stdout.log 2> ../logs/trade-action-topology-stderr.log &
popd