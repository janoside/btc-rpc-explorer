This changelog specifically tracks changes to the Public API available at `/api` and is maintained separately from the app CHANGELOG such that it can properly adhere to semantic versioning.

##### v2.1.0
###### Unreleased

* Changed `/api/mempool/fees` to include more details pertaining to `nextBlock` (nextBlock.smart is where the previous "nextBlock" scalar value used to be)

##### v2.0.0
###### 2023-06-14

* BREAKING: All actions now return JSON content
* Added:
	* `/api/blocks/tip` (replaces `/api/blocks/tip/hash` and `/api/blocks/tip/height`)
	* `/api/xyzpub/txids/$XPUB`
	* `/api/xyzpub/addresses/$XPUB`
	* `/api/block/header/$HEIGHT`
	* `/api/block/header/$HASH`
	* `/api/blockchain/next-halving`
	* `/api/holidays/all`
	* `/api/holidays/today`
	* `/api/holidays/$DAY`
	* `/api/tx/volume/24h`
	* `/api/price/marketcap` (replaces `/api/price/$CURRENCY/marketcap`)
	* `/api/price/sats` (replaces `/api/price/$CURRENCY/sats`)
* Changed output:
	* `/api/tx/$TXID`
		* Added result.vin[i].scriptSig.address
		* Added result.vin[i].scriptSig.type
		* Added result.fee, including result.fee.amount and result.fee.unit
		* Added result.fun, when applicable, which includes special details about the tx
	* `/api/price[/...]`
		* Return values exclude thousands separators by default; they can be added with "?format=true"
* Changed path:
	* `/api/util/xyzpub/$XPUB` -> `/api/xyzpub/$XPUB` (auto-redirect included)
* Removed:
	* `/api/blocks/tip/hash` (see `/api/blocks/tip`)
	* `/api/blocks/tip/height` (see `/api/blocks/tip`)
	* `/api/mempool/count` (see "size" field in output from `/api/mempool/summary`)
	* `/api/price/$CURRENCY/marketcap` (see individual fields in output from `/api/price/marketcap`)
	* `/api/price/$CURRENCY/sats` (see individual fields in output from `/api/price/sats`)



##### v1.1.0
###### 2021-12-07

* Added:
	* `/api/blockchain/utxo-set`
	* `/api/address/$ADDRESS`
	* `/api/mining/next-block`
	* `/api/mining/next-block/txids`
	* `/api/mining/next-block/includes/$TXID`
	* `/api/mining/miner-summary`



##### v1.0.0
###### 2021-08-10

* Initial release
