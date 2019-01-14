#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
pushd src
nodejs RunBlockProducerLoader.js > ../logs/load-block-producers-stdout.log 2> ../logs/load-block-producers-stderr.log &
popd