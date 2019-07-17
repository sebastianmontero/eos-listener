#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node RunRawVoterLoader.js > ../logs/load-raw-voters-stdout.log 2> ../logs/load-raw-voters-stderr.log &
popd