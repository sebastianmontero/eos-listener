#!/usr/bin/env bash

export NODE_ENV=$1
echo $NODE_ENV
cd "${BASH_SOURCE%/*}" || exit
pushd src
nodejs RunLoadMemoKeys.js &
popd