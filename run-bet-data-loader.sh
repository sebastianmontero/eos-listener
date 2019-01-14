#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
pushd src
nodejs RunBetDataLoader.js > ./logs/load-bet-data-stdout.log 2> ./logs/load-bet-data-stderr.log &
popd