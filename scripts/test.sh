#!/bin/sh

set -euo pipefail

echo $(dirname ${BASH_SOURCE[0]})
exit 0

ROOT=$(dirname $0/..)
cd $ROOT
echo $ROOT
PATH=$ROOT/node_modules/.bin:$PATH
BIN=$ROOT/node_modules/.bin

$($BIN/ts-node) -P $ROOT/tsconfig.json ./src/__test__/DataGraph.spec.ts | $($BIN/tap-dot)
