# WhatsOnChain Blockchain Explorer

Simple, database-free SV blockchain explorer, via RPC. Built with Node.js, express, bootstrap-v4.

This tool is intended to be a simple, self-hosted explorer for the Bitcoin blockchain, driven by RPC calls.

Live demo available at:

* BSV: https://whatsonchain.com

# Features

* Browse blocks
* View block details
* View transaction details, with navigation "backward" via spent transaction outputs
* View JSON content used to generate most pages
* Search supports transactions, blocks, addresses
* Mempool summary, with fee, size, and age breakdowns

## Prerequisites

1. Install and run a full, archiving node - https://github.com/bitcoin-sv/bitcoin-sv. Ensure that your node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin network.
3. "Recent" version of Node.js (8+ recommended).

## Instructions

1. Clone this repo: `git clone https://github.com/waqas64/btc-rpc-explorer`
2. `npm install`
3. `npm run build`
4. Edit the "rpc" settings in [app/credentials.js](app/credentials.js) to target your node
5. Optional: Change the "coin" value in [app/config.js](app/config.js).
6. Optional: Add an ipstack.com API access key to [app/credentials.js](app/credentials.js). Doing so will add a map to the /peers page.
7. `npm start` to start the local server
8. Visit http://127.0.0.1:3002/

## Run via Docker

1. `docker build -t btc-rpc-explorer .`
2. `docker run -p 3002:3002 -it btc-rpc-explorer`
