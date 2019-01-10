#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
pushd src
nodejs RunBlockProducerLoader.js &
popd