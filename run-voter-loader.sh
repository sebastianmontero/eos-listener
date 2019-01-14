#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
pushd src
nodejs RunVoterLoader.js > ../logs/load-voters-stdout.log 2> ../logs/load-voters-stderr.log &
popd