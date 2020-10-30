# GRS RPC Explorer

![homepage](https://github.com/groestlcoin/grs-rpc-explorer/blob/master/public/img/screenshots/homepage.png?raw=true)

[![npm version][npm-ver-img]][npm-ver-url] [![NPM downloads][npm-dl-img]][npm-dl-url]


Simple, database-free Groestlcoin blockchain explorer, via RPC to [Groestlcoin Core](https://github.com/groestlcoin/groestlcoin).

This is a simple, self-hosted explorer for the Groestlcoin blockchain, driven by RPC calls to your own [Groestlcoin](https://github.com/groestlcoin/groestlcoin) node. It is easy to run and can be connected to other tools (like [ElectrumX](https://github.com/spesmilo/electrumx)) to achieve a full-featured explorer.

Whatever reasons one may have for running a full node (trustlessness, technical curiosity, supporting the network, etc) it's helpful to appreciate the "fullness" of your node. With this explorer, you can explore not just the blockchain database, but also explore the functional capabilities of your own node.

Live demo available at: [https://rpcexplorer.groestlcoin.org](https://rpcexplorer.groestlcoin.org)

# Features

* Network Summary dashboard
* View details of blocks, transactions, and addresses
* Analysis tools for viewing stats on blocks, transactions, and miner activity
* See raw JSON content from bitcoind used to generate most pages
* Search by transaction ID, block hash/height, and address
* Optional transaction history for addresses by querying from ElectrumX, blockchain.com, blockchair.com, or blockcypher.com
* Mempool summary, with fee, size, and age breakdowns
* RPC command browser and terminal

# Changelog / Release notes

See [CHANGELOG.md](/CHANGELOG.md).

# Getting started

## Prerequisites

1. Install and run a full, archiving node. Ensure that your groestlcoin node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Groestlcoin network (you *can* use this tool while your node is still sychronizing, but some pages may fail).
3. Install a "recent" version of Node.js (8+ recommended).

## Install / Run

If you're running on mainnet with the default datadir and port, the default configuration should *Just Work*. Otherwise, see the **Configuration** section below.

#### Run from source:

1. `git clone git@github.com:groestlcoin/grs-rpc-explorer.git`
2. `npm install`
3. `npm start`


Using either method (`npm install` or run from source), after startup open [http://127.0.0.1:3002/](http://127.0.0.1:3002/)


## Configuration

Configuration options may be set via environment variables or CLI arguments.

#### Configuration with environment variables

To configure with environment variables, you need to create one of the 2 following files and enter values in it:

1. `~/.config/grs-rpc-explorer.env`
2. `.env` in the working directory for grs-rpc-explorer

In either case, refer to [.env-sample](.env-sample) for a list of the options and formatting details.

#### Configuration with CLI args

For configuring with CLI arguments, run `grs-rpc-explorer --help` for the full list of options. An example execution is:

```bash
grs-rpc-explorer --port 8080 --bitcoind-port 18443 --bitcoind-cookie ~/.groestlcoin/regtest/.cookie
```

#### Demo site settings

To match the features visible on the demo site at [https://rpcexplorer.groestlcoin.org](https://rpcexplorer.groestlcoin.org) you'll need to set the following non-default configuration values:

    BTCEXP_DEMO=true 		# enables some demo/informational aspects of the site
    BTCEXP_NO_RATES=false		# enables querying of exchange rate data
    BTCEXP_SLOW_DEVICE_MODE=false	# enables resource-intensive tasks (UTXO set query, 24hr volume querying) that are inappropriate for "slow" devices



## Run via Docker

1. `docker build -t grs-rpc-explorer .`
2. `docker run -it -p 3002:3002 -e BTCEXP_HOST=0.0.0.0 grs-rpc-explorer`


## Reverse proxy with HTTPS

See [instructions here](docs/nginx-reverse-proxy.md) for using nginx+certbot (letsencrypt) for an HTTPS-accessible, reverse-proxied site.
