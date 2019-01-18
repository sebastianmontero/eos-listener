#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
nodejs RunBetDataLoader.js > ../logs/load-bet-data-stdout.log 2> ../logs/load-bet-data-stderr.log &
popd