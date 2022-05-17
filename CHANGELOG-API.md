This changelog specifically tracks changes to the Public API available at `/api` and is maintained separately from the app CHANGELOG such that it can properly adhere to semantic versioning.

##### v1.2.0
###### Unreleased

* /api/tx/:txid
    * Added result.vin[i].scriptSig.address
    * Added result.vin[i].scriptSig.type
    * Added result.fee, including result.fee.amount and result.fee.unit



##### v1.1.0
###### 2021-12-07

* Added: /api/blockchain/utxo-set
* Added: /api/address/:address
* Added: /api/mining/next-block
* Added: /api/mining/next-block/txids
* Added: /api/mining/next-block/includes/:txid
* Added: /api/mining/miner-summary



##### v1.0.0
###### 2021-08-10

* Initial release
