# BTC RPC Explorer

Simple, database-free Bitcoin blockchain explorer, via RPC. Built with Node.js, express, bootstrap-v4.

This tool is intended to be a simple, self-hosted explorer for the Bitcoin blockchain, driven by RPC calls to your own bitcoind node. This tool is easy to run but currently lacks features compared to database-backed explorers.

I built this tool because I wanted to use it myself. Whatever reasons one might have for running a full node (trustlessness, technical curiosity, supporting the network, etc) it's helpful to appreciate the "fullness" of your node. With this explorer, you can not only explore the blockchain (in the traditional sense of the term "explorer"), but also explore the functional capabilities of your own node.

Live demos are available at:

* BTC: https://btc.chaintools.io
* LTC: https://ltc.chaintools.io

# Features

* Browse blocks
* View block details
* View transaction details, with navigation "backward" via spent transaction outputs
* View JSON content used to generate most pages
* Search supports transactions, blocks, addresses
* Optional transaction history for addresses by querying configurable ElectrumX servers
* Mempool summary, with fee, size, and age breakdowns
* RPC command browser and terminal
* Currently supports BTC, LTC (support for any Bitcoin-RPC-protocol-compliant coin can be added easily)

# Getting started

The below instructions are geared toward BTC, but can be adapted easily to other coins.

## Prerequisites

1. Install and run a full, archiving node - [instructions](https://bitcoin.org/en/full-node). Ensure that your bitcoin node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin network.
3. "Recent" version of Node.js (8+ recommended).

## Instructions

1. Clone this repo: `git clone https://github.com/janoside/btc-rpc-explorer`
2. `npm install`
3. `npm run build`
4. Set environment variables with your bitcoind rpc credentials and other settings. See [configuration](#configuration).
5. `npm start`
6. Open [http://127.0.0.1:3002/](http://127.0.0.1:3002/)

### Configuration

Configuration options may be passed as environment variables.
You can also set them in a `.env` file in the root directory, in the following format:

```
BTCEXP_BITCOIND_HOST = localhost
BTCEXP_BITCOIND_PORT = 8332
BTCEXP_BITCOIND_USER = username
BTCEXP_BITCOIND_PASS = password
BTCEXP_IPSTACK_KEY = 0000aaaafffffgggggg
BTCEXP_COOKIE_SECRET = 0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f
```

You may enable password protection by setting `BTCEXP_LOGIN=<password>`.
Authenticating is done with http basic auth, using the selected password and an empty (or any) username.

## Run via Docker

1. `docker build -t btc-rpc-explorer .`
2. `docker run -p 3002:3002 -it btc-rpc-explorer`

# Donate

Any support for continued development of this tool is appreciated!

* [Bitcoin](bitcoin:3NPGpNyLLmVKCEcuipBs7G4KpQJoJXjDGe): 3NPGpNyLLmVKCEcuipBs7G4KpQJoJXjDGe

![Bitcoin Donation QR Code](/public/img/qr-btc.png)

* [Litecoin](litecoin:ME4pXiXuWfEi1ANBDo9irUJVcZBhsTx14i): ME4pXiXuWfEi1ANBDo9irUJVcZBhsTx14i

![Litecoin Donation QR Code](/public/img/qr-ltc.png)

