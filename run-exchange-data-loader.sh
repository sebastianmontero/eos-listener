#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
nodejs RunExchangeDataLoader.js > ../logs/load-exchange-data-stdout.log 2> ../logs/load-exchange-data-stderr.log &
popd