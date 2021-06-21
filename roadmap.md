* Privacy analysis
* Multisig designations for tx inputs
	* Ref1: https://mempool.space/tx/09195e5c88b620b3c9d55f628edd5115fbfbdf49576579a6e2ed329e0e9bcf73
		* Src: https://github.com/mempool/mempool/blob/master/frontend/src/app/components/address-labels/address-labels.component.ts#L33
	* Ref2: https://blockstream.info/tx/09195e5c88b620b3c9d55f628edd5115fbfbdf49576579a6e2ed329e0e9bcf73?expand
		* Src: https://github.com/Blockstream/electrs/blob/new-index/src/rest.rs#L223
	* Use RPC "decodescript"?
	* Also include this in /block-analysis summaries
* Holidays
	* Genesis Day
	* Pizza Day
* Countdown to halving
* Countdown to difficulty change
* Patoshi mining config
* Historical mining config:
	* Hal: 78?
* Script parsing

#### Misc / Minor

* cleanup trailing whitespace: https://github.com/david/wcn-rpc-explorer/commit/abccbcced24a3299b559166f8c4b58a33f9008d0#comments


* "utils.js" accessible from frontend JS code (to avoid some of /snippet?)

* tx-io-details: some visual separator btw input/output when there are no HRs (as is the case for 1-input-1-output txs)


* move to simpler variable structure - remove "result.getblock" kind of structure in favor of "block"
* don't double-get the block for /block-height pages (maybe /block pages too): in action handler "getBlockByHeight" is called, then "getBlockByHashWithTransactions", which internally calls "getBlockByHash"
* get rid of magic numbers (e.g. 100,000,000)
* re-visit the old "conflicted results" concept in electrumAddressApi (it's been removed from UI when moving to v3, but maybe should return)

* ability to activate a non-default UI tab via URL param

* cache difficulty data on /diff-hist page, so subsequent runs are super fast (tiny amt of data to cache)
* cache miner data on /mining-summary page, so subsequent runs are super fast (tiny amt of data to cache)