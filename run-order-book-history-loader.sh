#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node RunOrderBookHistoryLoader.js > ../logs/order-book-history-loader-stdout.log 2> ../logs/order-book-history-loader-stderr.log &
popd