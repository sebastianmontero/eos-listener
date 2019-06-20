#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node RunBlockProducerLoader.js > ../logs/load-block-producers-stdout.log 2> ../logs/load-block-producers-stderr.log &
popd