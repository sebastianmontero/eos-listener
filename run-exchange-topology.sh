#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node ExchangeTopology.js > ../logs/exchange-topology-stdout.log 2> ../logs/exchange-topology-stderr.log &
popd