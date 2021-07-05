# WCN RPC Explorer

Simple, database-free Widecoin blockchain explorer, via RPC to [Widecoin Core](https://github.com/widecoin-project/widecoin).

This is a simple, self-hosted explorer for the Bitcoin blockchain, driven by RPC calls to your own [Widecoin](https://github.com/widecoin-project/widecoin) node. It is easy to run and can be connected to other tools (like [ElectrumX](https://github.com/spesmilo/electrumx)) to achieve a full-featured explorer.

Whatever reasons one may have for running a full node (trustlessness, technical curiosity, supporting the network, etc) it's helpful to appreciate the "fullness" of your node. With this explorer, you can explore not just the blockchain database, but also explore the functional capabilities of your own node.

Live available at:

* Mainnet - [explorer.widecoin.org:5000](https://explorer.widecoin.org/)

# Features

* Network Summary dashboard
* View details of blocks, transactions, and addresses
* Analysis tools for viewing stats on blocks, transactions, and miner activity
* See raw JSON content from widecoind used to generate most pages
* Search by transaction ID, block hash/height, and address
* Optional transaction history for addresses by querying from Electrum-protocol servers (e.g. Electrs, ElectrumX), blockchain.com, blockchair.com, or blockcypher.com
* Mempool summary, with fee, size, and age breakdowns
* RPC command browser and terminal


# Changelog / Release notes

See [CHANGELOG.md](/CHANGELOG.md).


# Getting started

## Prerequisites

1. Install and run a full, archiving node - [instructions](https://widecoin.org/en/full-node). Ensure that your widecoin node has its RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin network (you *can* use this tool while your node is still sychronizing, but some pages may fail).
3. Install a "recent" version of Node.js (8+ recommended).

### Note about pruning and indexing configurations

This tool is designed to work best with full transaction indexing enabled (`txindex=1`) and pruning **disabled**. 
However, if you're  Widecoin Core v0.21+ you can run *without* `txindex` enabled and/or *with* `pruning` enabled and this tool will continue to function, but some data will be incomplete or missing. Also note that suchWidecoin Core configurations receive less thorough testing.

In particular, with `pruning` enabled and/or `txindex` disabled, the following functionality is altered:

* You will only be able to search for mempool, recently confirmed, and wallet transactions by their txid. Searching for non-wallet transactions that were confirmed over 3 blocks ago is only possible if you provide the confirmed block height in addition to the txid.
* Pruned blocks will display basic header information, without the list of transactions. Transactions in pruned blocks will not be available, unless they're wallet-related. Block stats will only work for unpruned blocks.
* The address and amount of previous transaction outputs will not be shown, only the txid:vout.
* The mining fee will only be available for unconfirmed transactions.


## Install / Run

If you're running on mainnet with the default datadir and port, the default configuration should *Just Work*. Otherwise, see the **Configuration** section below.

#### Install via `npm`:

```bash
npm install -g wcn-rpc-explorer
wcn-rpc-explorer
```

#### Run from source:

1. `git clone https://github.com/widecon-project/wcn-rpc-explorer`
2. `cd wcn-rpc-explorer`
3. `npm install`
4. `npm start`


Using either method (`npm install` or run from source), after startup open [http://127.0.0.1:5000/](http://127.0.0.1:5000/)


## Configuration

Configuration options may be set via environment variables or CLI arguments.

#### Configuration with environment variables

To configure with environment variables, you need to create one of the 2 following files and enter values in it:

1. `~/.config/wcn-rpc-explorer.env`
2. `.env` in the working directory for wcn-rpc-explorer

In either case, refer to [.env-sample](.env-sample) for a list of the options and formatting details.

#### Configuration with CLI args

For configuring with CLI arguments, run `wcn-rpc-explorer --help` for the full list of options. An example execution is:

```bash
wcn-rpc-explorer --port 8080 --widecoind-port 18443 --widecoind-cookie ~/.widecoin/regtest/.cookie
```

#### Demo site settings

To match the features visible on the demo site at [explorer.widecoin.org](https://explorer.widecoin.org/) you'll need to set the following non-default configuration values:

    BTCEXP_DEMO=true 		# enables some demo/informational aspects of the site
    BTCEXP_NO_RATES=false		# enables querying of exchange rate data
    BTCEXP_SLOW_DEVICE_MODE=false	# enables resource-intensive tasks (UTXO set query, 24hr volume querying) that are inappropriate for "slow" devices
    BTCEXP_ADDRESS_API=electrum 	# use electrum-protocol servers for address lookups
    BTCEXP_ELECTRUM_SERVERS=tcp://your-electrum-protocol-server-host:50001		# address(es) for my electrum-protocol server(s)
    BTCEXP_IPSTACK_APIKEY=your-api-key		# enable peer ip geo-location
    BTCEXP_MAPBOX_APIKEY=your-api-key		# enable map of peer locations

#### SSO authentication

You can configure SSO authentication similar to what ThunderHub and RTL provide.
To enable it, make sure `BTCEXP_BASIC_AUTH_PASSWORD` is **not** set and set `BTCEXP_SSO_TOKEN_FILE` to point to a file write-accessible by wcn-rpc-explorer.
Then to access wcn-rpc-explorer, your SSO provider needs to read the token from this file and set it in URL parameter `token`.
For security reasons the token changes with each login, so the SSO provider needs to read it each time!

After successfull access with the token a cookie is used for authentication, so you don't have to worry about it anymore.
To improve user experience you can set `BTCEXP_SSO_LOGIN_REDIRECT_URL` to the URL of your SSO provider.
This causes the users to be redirected to login page if not logged in.

## Run via Docker

1. `docker build -t wcn-rpc-explorer .`
2. `docker run -it -p 3002:3002 -e BTCEXP_HOST=0.0.0.0 wcn-rpc-explorer`


## Reverse proxy with HTTPS

See [instructions here](docs/nginx-reverse-proxy.md) for using nginx+certbot (letsencrypt) for an HTTPS-accessible, reverse-proxied site.


[npm-ver-img]: https://img.shields.io/npm/v/wcn-rpc-explorer.svg?style=flat
[npm-ver-url]: https://www.npmjs.com/package/wcn-rpc-explorer
[npm-dl-img]: http://img.shields.io/npm/dm/wcn-rpc-explorer.svg?style=flat
[npm-dl-url]: https://npmcharts.com/compare/wcn-rpc-explorer?minimal=true

