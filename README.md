
<p align="center">
<img src="https://user-images.githubusercontent.com/34191200/35906968-0a422cb8-0c1f-11e8-85e4-7be0ccb6019d.png" />
</p>

# BCA Explorer

Simple, database-free Bitcoin Atom blockchain explorer, via RPC. Built with Node.js, express, bootstrap-v4.

This tool is intended to be a simple, self-hosted explorer for the Bitcoin Atom blockchain, driven by RPC calls to your own atomd node. This tool is easy to run but lacks features compared to full-fledged (stateful) explorers.

It is a fork of the open-source [BTC Explorer](https://github.com/janoside/btc-rpc-explorer). If you run your own [Atom Full Node](https://github.com/bitcoin-atom/bitcoin-atom), this explorer can easily run alongside it, communicating via RPC calls.

# Features

* List of recent blocks
* Browse blocks by height, in ascending or descending order
* View block details
* View transaction details, with navigation "backward" via spent transaction outputs
* View raw JSON output used to generate most pages
* Search to directly navigate to transactions or blocks
* Mempool summary, showing unconfirmed transaction counts by fee level
* RPC Browser to explore all of the RPC commands available from your node
* RPC Terminal to send arbitrary commands to your node

# Getting started

## Prerequisites

1. Install and run a full, archiving node - [Atom Downloads](https://github.com/bitcoin-atom/bitcoin-atom/releases). Ensure that your node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin Atom network.

## Instructions

1. Clone this repo
2. `npm install` to install all required dependencies
3. Optional: Uncomment the "bitcoind" section in [env.js](app/env.js) to automatically connect to the target node.
4. `npm start` to start the local server
5. Navigate to http://127.0.0.1:3002/
6. Connect using the RPC credentials for your target BCA node (if you didn't edit [env.js](app/env.js) in Step 3)
