#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node OrderBookTopology.js > ../logs/order-book-topology-stdout.log 2> ../logs/order-book-topology-stderr.log &
popd