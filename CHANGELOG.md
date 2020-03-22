#### v2.0.0
##### 2020-02-23

* Optional querying of UTXO set summary
    * Note: this is disabled by default to protect slow nodes. Set 'BTCEXP_SLOW_DEVICE_MODE' to false in your `.env` file to enjoy this feature.
* More data in homepage "Network Summary":
    * Fee estimates (estimatesmartfee) for 1, 6, 144, 1008 blocks
    * Hashrate estimate for 1+7 days
    * New item for 'Chain Rewrite Days', using 7day hashrate
    * New data based on optional UTXO set summary (see note above):
        * UTXO set size
        * Total coins in circulation
        * Market cap
    * 24-hour network volume (sum of outputs)
* Tweaks to data in blocks lists:
    * Simpler timestamp formatting for easy reading
    * Include "Time-to-Mine" (TTM) for each block (with green/red highlighting for "fast"/"slow" (<5min/>15min) blocks)
    * Display average fee in sat/vB
    * Add total fees
    * Add output volume (if `getblockstats` rpc call is supported, i.e. 0.17.0+)
    * Show %Full instead of weight/size
* New data in "Summary" on Block pages (supported for bitcoind v0.17.0+)
    * Fee percentiles
    * Min / Max fees
    * Input / Output counts
    * Outputs total value
    * UTXO count change
    * Min / Max tx sizes
* New tool `/block-stats` for viewing summarized block data from recent blocks
* New tool `/mining-summary` for viewing summarized mining data from recent blocks
* New tool `/block-analysis` for analyzing the details of transactions in a block
* Change `/mempool-summary` to load data via ajax (UX improvement to give feedback while loading large data sets)
* Zero-indexing for tx inputs/outputs (#173)
* Labels for transaction output types
* Configurable UI "sub-header" links
* Start of RPC API versioning support
* Tweaked styling
* Homepage tweaks
    * Remove "Bitcoin Explorer" H1 (it's redundant)
    * Hide the "Date" (timestamp) column for recent blocks (the Age+TTM is more valuable)
* Updated miner configs

#### v1.1.9
##### 2020-02-23

* Fix for unescaped user search query display (#183)
* More detailed network info on `/node-status`
* Updated bootstrap, jquery
* Disable stacktrace log output by default (#170)
* Updated miner configs

#### v1.1.8
##### 2020-01-09

* Fix for missing changelog file when installed via npm
* Updated miner configs

#### v1.1.5
##### 2019-12-22

* Fix startup issues when connecting to a node that's not ready to serve data (e.g. verifying blocks)
* Homepage header: show exchange rate in selected currency (rather than hardcoded USD)
* Homepage header: show sat/USD or sat/EUR

#### v1.1.4
###### 2019-12-04

* First-class support for testnet/regtest

#### v1.1.3
###### 2019-12-02

* Fixes related to running bitcoind 0.19.0.1
* Updated dependencies
* Version number in footer
* `/changelog` linked in footer

#### v1.1.2 
###### 2019-10-17

* Add back map on `/peers` that was lost with recent bug

#### v1.1.1
###### 2019-10-01

* Add new default blacklist items for some 'hidden' RPCs
* Print app version info to log on startup
* Remove LTC site from footer

#### v1.1.0
###### 2019-09-30

* Show spent/unspent status on tx detail pages
* Show mempool ancestor/descendant txs on tx detail pages
* Blacklist 'createwallet' by default
* Show RBF status for unconfirmed txs
* Faster, more reliable display of `/mempool-summary` and `/unconfirmed-tx` pages
* Fix for persisting arg values in UI on `/rpc-browser`
* Misc minor fixes and ux tweaks

#### v1.0.3
###### 2019-04-27

* Pluggable address API supporting different implementations
* Logging improvements
* Fix to avoid caching unconfirmed txs
* Identify destroyed fees
* Misc minor fixes and ux tweaks

#### v1.0.2
###### 2019-03-13

* Fix for background color on light theme

#### v1.0.1
###### 2019-03-13

* Dark theme
* Tx rate graph on homepage
* Improved caching
* Misc minor fixes and ux tweaks

#### v1.0.0
###### 2019-02-23

* Initial release
