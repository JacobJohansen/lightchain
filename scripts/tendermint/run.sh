#!/usr/bin/env bash

source $(dirname $0)/../utils.sh

ROOT_PATH="$(cd "$(dirname "$0")" && pwd)/.."

HOME_DIR="${HOME}/.lightchain/tendermint"
EXEC_BIN="${GOPATH}/src/github.com/tendermint/tendermint/build/tendermint"
CONFIG_FILE="${GOPATH}/src/github.com/lightstreams-network/lightchain/_legacy/setup/tendermint/config.toml"
GENESIS_FILE="${GOPATH}/src/github.com/lightstreams-network/lightchain/_legacy/setup/tendermint/genesis.json"

while [ "$1" != "" ]; do
    case $1 in
        --datadir) 
            shift
            DATA_DIR=$1
        ;;
        --debug) 
            IS_DEBUG=1 
        ;;
        --not-empty) 
            NOT_EMPTY_BLOCK=1 
        ;;
        --clean) 
            CLEAN=1 
        ;;
        --hard) 
            HARD_MODE=1 
        ;;
        * )
            echo "Invalid argument ${1}"
            exit 1
    esac
    shift
done

pushd "$ROOT_PATH"


INIT_ARGS="--home ${HOME_DIR}"

NODE_ARGS="--home ${HOME_DIR}"
#NODE_ARGS="${NODE_ARGS} --log_level='*:debug' "
#NODE_ARGS="${NODE_ARGS} --p2p.laddr=tcp://0.0.0.0:26656 --proxy_app=tcp://127.0.0.1:26658 --rpc.laddr=tcp://0.0.0.0:26657"

if [ -n "${NOT_EMPTY_BLOCK}" ]; then
	NODE_ARGS="${NODE_ARGS} --consensus.create_empty_blocks=false"
fi

if [ -n "${CLEAN}" ]; then
	if [ -n "${HARD_MODE}" ]; then
		run "rm -rf ${HOME_DIR}"
		run "${EXEC_BIN} ${INIT_ARGS} init"
		run "cp ${CONFIG_FILE} ${HOME_DIR}/config/config.toml"
		run "cp ${GENESIS_FILE} ${HOME_DIR}/config/genesis.json"
	else
	    run "rm -rf ${HOME_DIR}/data"
	    run "${EXEC_BIN} unsafe_reset_priv_validator"
	fi
fi

if [ -n "${IS_DEBUG}" ]; then
    EXEC_CMD="dlv --listen=:2346 --headless=true --api-version=2 exec ${EXEC_BIN} -- node ${NODE_ARGS}"
else
    EXEC_CMD="${EXEC_BIN} node ${NODE_ARGS} node"
fi

run "$EXEC_CMD"

popd

echo -e "Execution completed"
exit 0
