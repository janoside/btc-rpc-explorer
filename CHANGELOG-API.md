This changelog specifically tracks changes to the Public API available at `/api` and is maintained separately from the app CHANGELOG such that it can properly adhere to semantic versioning.

##### v1.2.0
###### Unreleased

* Added: /api/xyzpub/txids/:xyzpub
* Added: /api/xyzpub/addresses/:xyzpub
* Added: /api/block/header/:height
* Added: /api/block/header/:hash
* Added: /api/holidays/all
* Added: /api/holidays/today
* Added: /api/holidays/:day
* Added: /api/tx/volume/24h
* Changed: /api/tx/:txid
    * Added result.vin[i].scriptSig.address
    * Added result.vin[i].scriptSig.type
    * Added result.fee, including result.fee.amount and result.fee.unit
    * Added result.fun, when applicable, which includes special details about the tx
* Changed path: /api/util/xyzpub/:xyzpub -> /api/xyzpub/:xyzpub (auto-redirect included)


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
