#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
pushd src
nodejs RunAccountBalanceLoader.js > ../logs/account-balance-loader-stdout.log 2> ../logs/account-balance-loader-stderr.log &
popd