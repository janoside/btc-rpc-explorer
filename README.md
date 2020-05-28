# BTC RPC Explorer

[![npm version][npm-ver-img]][npm-ver-url] [![NPM downloads][npm-dl-img]][npm-dl-url]


Simple, database-free Bitcoin blockchain explorer, via RPC. Built with Node.js, express, bootstrap-v4.

This tool is intended to be a simple, self-hosted explorer for the Bitcoin blockchain, driven by RPC calls to your own bitcoind node. This tool is easy to run but lacks features compared to database-backed explorers.

Whatever reasons one might have for running a full node (trustlessness, technical curiosity, supporting the network, etc) it's helpful to appreciate the "fullness" of your node. With this explorer, you can not only explore the blockchain (in the traditional sense of the term "explorer"), but also explore the functional capabilities of your own node.

Live demo available at: [https://explorer.btc21.org](https://explorer.btc21.org)

# Features

* Network Summary "dashboard"
* View details of blocks, transactions, and addresses
* Analysis tools for viewing stats on blocks, transactions, and miner activity
* See the raw JSON content returned by bitcoind that's used to generate most pages
* Search by transaction ID, block hash/height, and address
* Optional transaction history for addresses by querying from ElectrumX, blockchain.com, blockchair.com, or blockcypher.com
* Mempool summary, with fee, size, and age breakdowns
* RPC command browser and terminal

# Changelog / Release notes

See [CHANGELOG.md](/CHANGELOG.md).

# Getting started

## Prerequisites

1. Install and run a full, archiving node - [instructions](https://bitcoin.org/en/full-node). Ensure that your bitcoin node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin network (you *can* use this tool while your node is still sychronizing, but some pages may fail).
3. Install a "recent" version of Node.js (8+ recommended).

## Install / Run

If you're running on mainnet with the default datadir and port, the default configuration should *Just Work*. Otherwise, see the **Configuration** section below.

#### Install via `npm`:

```bash
npm install -g btc-rpc-explorer
btc-rpc-explorer
```

#### Run from source:

1. `git clone git@github.com:janoside/btc-rpc-explorer.git`
2. `npm install`
3. `npm start`


Using either method (`npm install` or run from source), after startup open [http://127.0.0.1:3002/](http://127.0.0.1:3002/)


## Configuration

Configuration options may be set via environment variables or CLI arguments.

#### Configuration with environment variables

To configure with environment variables, you need to create one of the 2 following files and enter values in it:

1. `~/.config/btc-rpc-explorer.env`
2. `.env` in the working directory for btc-rpc-explorer

In either case, refer to [.env-sample](.env-sample) for a list of the options and formatting details.

#### Configuration with CLI args

For configuring with CLI arguments, run `btc-rpc-explorer --help` for the full list of options. An example execution is:

```bash
btc-rpc-explorer --port 8080 --bitcoind-port 18443 --bitcoind-cookie ~/.bitcoin/regtest/.cookie
```

#### Demo site settings

To match the features visible on the demo site at [https://explorer.btc21.org](https://explorer.btc21.org) you'll need to set the following non-default configuration values:

    BTCEXP_DEMO=true 		# enables some demo/informational aspects of the site
    BTCEXP_NO_RATES=false		# enables querying of exchange rate data
    BTCEXP_SLOW_DEVICE_MODE=false	# enables resource-intensive tasks (UTXO set query, 24hr volume querying) that are inappropriate for "slow" devices



## Run via Docker

1. `docker build -t btc-rpc-explorer .`
2. `docker run -p 3002:3002 -it btc-rpc-explorer`

# Support

If you get value from this project, please consider supporting my continued work with a donation. Any and all donations are truly appreciated.

* [https://donate.btc21.org](https://donate.btc21.org)


[npm-ver-img]: https://img.shields.io/npm/v/btc-rpc-explorer.svg?style=flat
[npm-ver-url]: https://www.npmjs.com/package/btc-rpc-explorer
[npm-dl-img]: http://img.shields.io/npm/dm/btc-rpc-explorer.svg?style=flat
[npm-dl-url]: https://npmcharts.com/compare/btc-rpc-explorer?minimal=true

