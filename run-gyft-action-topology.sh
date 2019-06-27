#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node GyftActionTopology.js > ../logs/gyft-action-topology-stdout.log 2> ../logs/gyft-action-topology-stderr.log &
popd