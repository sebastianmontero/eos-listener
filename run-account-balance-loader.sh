#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
node RunAccountBalanceLoader.js > ../logs/account-balance-loader-stdout.log 2> ../logs/account-balance-loader-stderr.log &
popd