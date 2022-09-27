##### v3.?
###### Unreleased

* Include median fee rate for next-block estimates, on homepage and at [/next-block](./next-block)
* Minor fixes for running against Bitcoin Core v23
* URL change: /mining-template -> /next-block (redirect is included for compatibility)
* Homepage additions
	* Show difficulty ATH comparison
	* Show "Next Block" fullness
	* Show a banner if 'today' is a Bitcoin 'Holiday' (see more below)
* Several new API actions/changes; see [/api/changelog](./api/changelog)
* New [/holidays](./holidays), a curated list of Bitcoin 'Holidays'
* Support for serving static assets via a configurable CDN
* Misc fixes for erroneous data display on non-mainnet nodes
* Switch from fontawesome to bootstrap-icons v1.8.0
* Refreshed miner-identification database
* UI/UX tweaks
* Updated dependencies


##### v3.3.0
###### 2021-12-07

* New tool for viewing the UTXO Set: [/utxo-set](./utxo-set)
* New API actions:
	* [/api/blockchain/utxo-set](./api/blockchain/utxo-set)
	* [/api/address/yourAddress](./api/address/yourAddress)
	* [/api/mining/next-block](./api/mining/next-block)
	* [/api/mining/next-block/txids](./api/mining/next-block/txids)
	* [/api/mining/next-block/includes/:txid](./api/mining/next-block/includes/yourTxid)
	* [/api/mining/miner-summary](./api/mining/miner-summary?since=1d)
* Major fixes for data displayed in [/tx-stats](./tx-stats) tool
* Updated miners, including identification of "Patoshi"-pattern blocks
* [/node-details](./node-details): Include `coinstatsindex` status
* Support querying UTXO Set even with slowDeviceMode=true, iff coinstatsindex is available
* Fix for difficulty adjustment estimate
* [/difficulty-history](./difficulty-history): Support for viewing different time ranges
* When viewing unconfirmed transaction details, show an info dialog if the transaction is predicted to be confirmed in the next block
* Performance improvements
	* Fix for performance degradation over time due to slow "estimatedSupply" function
	* Homepage speedup by making "Estimated Next Block" data load asynchonously
	* Caching for [/difficulty-history](./difficulty-history) data
* Unicode formatting for OP_RETURN and other similar data (with ascii+hex accessible via toggle)
* New `.env` options for setting defaults (see `.env-sample` for details):
	* BTCEXP_DISPLAY_CURRENCY (btc,sat,local)
	* BTCEXP_LOCAL_CURRENCY (usd,eur,gbp)
	* BTCEXP_UI_TIMEZONE (utc,local)
	* BTCEXP_UI_HIDE_INFO_PANELS (true,false)
* Support for displaying timestamps in local timezone (by using browser default, or setting a manual offset)
* Cleanup treatment of `locktime` on transaction details pages
* Unique favicon color based on the active network (mainnet=orange, testnet=green, signet=magenta, regtest=gray)
* Lots of minor styling improvements
* Error handling improvements
* Fix for `/api/quotes/all`
* Fix for incorrect date on "Diario El Salvador..." fun item (thanks [@Dirkson643](https://github.com/Dirkson643))
* New `Fun` items related to Taproot activation
* Performance log admin page at [/admin/perf-log](./admin/perf-log)
* Updated dependencies


##### v3.2.0
###### 2021-08-10

* Public API! See the docs at [/api/docs](./api/docs) (thanks [@pointbiz](https://github.com/pointbiz))
* XPUB pages: search for any xpub (ypub, zpub, etc) and see summary details and a list of associated addresses (thanks [@pointbiz](https://github.com/pointbiz))
* Homepage: add "Predicted Next Block" section
* Mempool Summary: add top-fee transactions table
* Improvements to transaction details UI, especially on smaller screens
* Cleanup support for Taproot/bech32m
* New [/mining-template](./mining-template) tool, showing structured output of `getblocktemplate` command
* Various improvements to charts and graphs throughout the tool (including lots of y-axis changes: linear->log)
* Better support for BIP9 soft forks shown on [/node-details](./node-details) (e.g. Taproot ST in 0.21.1) (Thanks [@Pantamis](https://github.com/Pantamis))
* New "Recent" and "Favorites" sections on [/rpc-browser](./rpc-browser)
* Block lists: show (min, avg, max) fee rates instead of just avg
* Random Bitcoin-related quote shown in footer on each page load
* New [/quotes](./quotes), curated list of Bitcoin-related quotes (each quote also having its own page like [this](`./quote/0`))
* Preemptive support for upcoming format change to `getrawtransaction` output (thanks [@xanoni](https://github.com/xanoni))
* Fix for incorrect homepage block count when using `BTCEXP_UI_HOME_PAGE_LATEST_BLOCKS_COUNT`
* Fix for inaccurate difficulty adjustment estimates
* Link to Tor v3 Hidden Service in footer
* Fix for `DEBUG` environment variable being ignored
* Fix for [/rpc-terminal](./rpc-terminal) not parsing non-int parameters properly
* Fix for edge case where txindex availability check fails at startup (add retries with exp. backoff)
* Fix for tiny-value display (i.e. 1e-8 -> 0.00000001)
* Misc UI/UX tweaks
* Cache busting for frontend resources
* Improved error handling in many places
* Updated dependencies


##### v3.1.1
###### 2021-04-20

* Fix SSO flow broken by v3.0.0 update
* Fix for regtest network errors on homepage
* Fix for server errors in Docker-based installs


##### v3.1.0
###### 2021-04-14

* Improvements to no-`txindex` support: now available for all versions of Bitcoin Core
* Move public sites to [BitcoinExplorer.org](https://bitcoinexplorer.org) (BIG thanks [@SatoshisDomains](https://twitter.com/SatoshisDomains))
* Add back the [/peers](./peers) tool in the "Tools" menu
	* Note: The map on the peers tool now requires users set their own `BTCEXP_MAPBOX_APIKEY` in `.env`
* Response compression
* Remove reference to unused `fonts.css`
* Increased static-files cache: 1hr -> 1mo
* Clearer UX around RPC connection failures (show the fact clearly, instead of flooding the log with cryptic errors)
* Fixed changelog for v3.0.0 release (added/clarified some issues)
* Updated favicons (Thanks [realfavicongenerator.net](https://realfavicongenerator.net))
* Fix for homepage error after failure to get AU exchange rate
* UX improvements on [/peers](./peers) page
* Graphs for top items in [/admin/stats](./admin/stats)
* Optional support for plausible.io analytics
* Fix to avoid displaying empty "Summary" section when we fail to get address txid list
* UX improvement around electrs too-many-txs-for-address errors


##### v3.0.0
###### 2021-04-08

* Major visual refresh!
	* All new design (layout, fonts, colors, etc)
	* Redesigned Dark Mode (now the default)
	* New app icon
* Support for pruned nodes and nodes with disabled `txindex`! (HUGE Thanks to [@shesek](https://github.com/shesek))
	* Note: Currently only Bitcoin Core versions 0.21+ are able to support this feature (a future improvement is planned to make it available to all versions)
* Mempool Summary improvements
	* Greatly improved performance for multiple loads via caching
	* Added: "Blocks Count" column by fee-rate bucket
	* Tool for estimating Block Depth of a transaction or a fee rate (Thanks [@pointbiz](https://github.com/pointbiz))
* Mining Summary: added doughnut chart for rev. breakdown, simplified table data
* Upgraded to Bootstrap 5 (currently beta3...)
* Update mapbox API (Thanks [@shesek](https://github.com/tyzbit))
	* Note: The map on the [/peers](./peers) page now requires that users set the env var `BTCEXP_MAPBOX_APIKEY` to their own API key
* Fix for 404 pages hanging (Thanks [@shesek](https://github.com/shesek))
* Add convenience redirect for baseUrl (Thanks [@shesek](https://github.com/shesek))
* Make url in logs clickable (Thanks [@shesek](https://github.com/shesek))
* Caching for static files (maxAge=1hr)
* Frontend performance optimizations
* Smarter performance/memory defaults for slow devices
* Major refactoring, modernization, and code-reuse improvements
* UX improvements and polish throughout
* URL changes
	* `/node-status` -> `/node-details`
	* `/unconfirmed-tx` -> `/mempool-transactions`
* Environment variable changes
	* The below changes were made to more clearly acknowledge that multiple Electrum-protocol implementations (e.g. ElectrumX, Electrs) can be used for address queries:
	* `BTCEXP_ADDRESS_API` value `electrumx` -> `electrum` (`electrumx` should still works)
	* `BTCEXP_ELECTRUMX_SERVERS` -> `BTCEXP_ELECTRUM_SERVERS` (`BTCEXP_ELECTRUMX_SERVERS` should still work)
* Updated dependencies
	* jQuery: v3.4.1 -> v3.6.0
	* highlight.js: v9.14.2 -> v10.7.1
	* fontawesome: v5.7.1 -> v5.15.3


##### v2.2.0
###### 2021-01-22

* New "Fun" item for the tx containing the whitepaper and new tool to extract the whitepaper and display it
* New fee rate data on `/block-analysis` pages
* New minor misc peer data available in Bitcoin Core RPC v0.21+
* New gold exchange rate on homepage
* Fix for SSO token generation URL encoding (Thanks [@shesek](https://github.com/shesek) and [@Kixunil](https://github.com/Kixunil))
* Fix for [/peers](./peers) map
* Fix for README `git clone` instructions (Thanks [@jonasschnelli](https://github.com/jonasschnelli))


#### v2.1.0
##### 2020-12-15

* Support for running on a configurable BASEURL, e.g. "/explorer/" (Thanks [@ketominer](https://github.com/ketominer), [@Kixunil](https://github.com/Kixunil), [@shesek](https://github.com/shesek))
* Support for SSO (Thanks [@Kixunil](https://github.com/Kixunil))
* Support for signet and taproot (Thanks [@guggero](https://github.com/guggero))
* Support for listening on 0.0.0.0 (Thanks [@lukechilds](https://github.com/lukechilds))
* Support for viewing list of block heights for each miner on `/mining-summary`
* Sanitizing of environment variables (Thanks [@lukechilds](https://github.com/lukechilds))
* Fix for XSS vulnerabilities (Thanks [@shesek](https://github.com/shesek))
* Fix for low severity lodash dependency vulnerability (Thanks [@abhiShandy](https://github.com/abhiShandy))
* Fix for zero block reward (eventually on mainnet, now on regtest) (Thanks [@MyNameIsOka](https://github.com/MyNameIsOka))
* Fix for cryptic error when running regtest with no blocks
* Fix for pagination errors on [/blocks](./blocks) (not displaying genesis block on the last page; error on last page when sort=asc)
* Electrum connect/disconnect stats on `/admin`
* Add P2SH bounty address `/fun` items (Thanks [@cd2357](https://github.com/cd2357))
* Misc cleanup (Thanks [@AaronDewes](https://github.com/AaronDewes))
* Add "Thanks" notes to changelog


#### v2.0.2
##### 2020-07-03

* Lots of improvements to connect/disconnect/error management with configured Electrum servers
* Include pending balance for addresses queried via ElectrumX, when available
* Include basic stats for Electrum queries on `/admin`
* Bug fixes
	* Fix for erroneous defaults for boolean env vars in some scenarios (slow device mode)
* Updated dependences and mining pools
* Misc cleanup (Thanks [@JosephGoulden](https://github.com/JosephGoulden))


#### v2.0.1
##### 2020-05-28

* Highlight coinbase spends in transaction I/O details
* Highlight very old UTXOs (5+ years) in transaction I/O details
* Transaction page: show "days destroyed"
* Bug fixes
	* Fix for "verifymessage" in RPC browser accepting multi-line messages
	* Fix to make "--slow-device-mode=false" work
	* Don't show errors on address page for bech32 due to trying to parse as base58
	* Fix "failure to render homepage when fee estimates are unavailable"
* Minor additions to "fun" data
* Updated dependences


#### v2.0.0
##### 2020-03-25

* New data points in homepage "Network Summary":
	* Fee estimates (estimatesmartfee) for 1, 6, 144, 1008 blocks
	* Hashrate estimate for 1+7 days
	* New item for 'Chain Rewrite Days', using 7day hashrate
	* New data based on UTXO-set summary. Note that UTXO-set querying is resource intensive and therefore disabled by default to protect slower nodes. Set `BTCEXP_SLOW_DEVICE_MODE` to `false` in your `.env` file to enjoy associated features:
		* UTXO-set size
		* Total coins in circulation
		* Market cap
	* 24-hour network volume (sum of tx outputs). This value is calculated at app launch and refreshed every 30min.
	* Avg block time for current difficulty epoch with estimate of next difficulty adjustment
* Tweaks to data in blocks lists:
	* Simpler timestamp formatting for easy reading
	* Include "Time-to-Mine" (TTM) for each block (with green/red highlighting for "fast"/"slow" (<5min / >15min) blocks)
	* Display average fee in sat/vB
	* Add total fees
	* Add output volume (if `getblockstats` rpc call is supported, i.e. 0.17.0+)
	* Show %Full instead of weight/size
* Block Detail page improvements
	* New data in "Summary" on Block pages (supported for bitcoind v0.17.0+)
		* Outputs total volume
		* Input / Output counts
		* UTXO count change
		* Min / Max tx sizes
	* New "Fees Summary" section (bitcoind v0.17.0+)
		* Fee rate percentiles
		* Fee rates: min, avg, max
		* Fee totals: min, avg, max
	* New "Technical Details" section. Items from "Summary" in previous versions have been moved here. This section is collapsible if desired.
* Improvements to transaction input/output displays
	* Change primary input data to be tx outpoint ("txid #voutIndex")
	* Zero-indexing for tx inputs/outputs (#173)
	* Labels for transaction input/output types
	* Inputs: when available, show "input address" below tx outpoint
	* Coinbase and OP_RETURN items: show ascii data inline with link to show hex data
* New tool `/block-stats` for viewing summarized block data from recent blocks
* New tool [/mining-summary](./mining-summary) for viewing summarized mining data from recent blocks
* New tool `/block-analysis` for analyzing the details of transactions in a block.
	* **IMPORTANT**: Use of `/block-analysis` can put heavy memory pressure on this app, depending on the details of the block being analyzed. If your app is crashing, consider setting a higher memory ceiling: `node --max_old_space_size=XXX bin/www` (where `XXX` is measured in MB).
* New tool [/difficulty-history](./difficulty-history) showing a graph of the history of all difficulty adjustments
* Change `/mempool-summary` to load data via ajax (UX improvement to give feedback while loading large data sets)
* Zero-indexing for tx index-in-block values
* Reduced memory usage
* Versioning for cache keys if using persistent cache (redis)
* Configurable UI "sub-header" links
* Start of RPC API versioning support
* Tweaked styling across site
* Homepage UI tweaks
	* Remove "Bitcoin Explorer" H1 (it's redundant)
	* Hide the "Date" (timestamp) column for recent blocks (the Age+TTM is more valuable)
* Updated miner configs
* Lots of minor bug fixes


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
* Faster, more reliable display of `/mempool-summary` and `/mempool-transactions` pages
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
