# ![BTC RPC Explorer](public/img/logo/logo-64.png)

# BTC RPC Explorer

Simple, stateless Bitcoin blockchain explorer, via RPC. Build with Node.js, express, bootstrap-v4.

# Getting started

## Prerequisites

1. Install and run a `Full Node` - [instructions](https://bitcoin.org/en/full-node). Ensure that your node has full transaction indexing enabled (`txindex=1`) and the RPC server enabled (`server=1`).
2. Synchronize your node with the Bitcoin network.

## Instructions

1. Clone this repo
2. `npm install` to install all required dependencies
3. `npm start` to start the local server
4. Navigate to http://127.0.0.1:3002/
5. Connect using the RPC credentials for your target bitcoin node

# Screenshots

### Connect via RPC
# ![Connect](public/img/screenshots/connect.png)

### Homepage (list of recent blocks)
# ![Connect](public/img/screenshots/home.png)

### Block Details
# ![Connect](public/img/screenshots/block.png)

### Transaction Details
# ![Connect](public/img/screenshots/transaction.png)

