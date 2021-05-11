# API documentation

## Blocks API
### /api/v1/blocks/tip/height
returns the height of the chain tip

return type is numeric

### /api/v1/blocks/tip/hash
returns the block hash of the chain tip

return type is numeric

### /api/v1/blocks/totalbtc
returns the current supply of Bitcoin (estimated on slow devices and before the UTXO set summary is loaded)

return type is numeric

### /api/v1/blocks/hashrate
returns the network hash rate based on the last 7 days of blocks. Expressed in Exa-hashes.

return type is json in this format

`{"1Day":174.1,"7Days":165.9,"30Days":158.5}`

### /api/v1/blocks/speed
returns the difficulty adjustment percentage. The network is either increasing or decreasing in speed. Decrease in speed will be a negative number.

return type is numeric


## Mempool API
### /api/v1/mempool/count
returns the number of transactions in the mempool

return type is numeric

### /api/v1/mempool/fees/recommended
returns fee rates in sats/vB for next block, next half an hour, next hour and next day as the minimum fee

return type is json in this format 

`{"fastestFee":17,"halfHourFee":9,"hourFee":9,"minimumFee":9}`


## Price API
### /api/v1/price/:currency
request parameters: currency (usd, eur, gbp, xau)

returns the price of 1 Bitcoin in USD, EUR, GBP, XAU

return type is numeric

### /api/v1/price/:currency/marketcap
request parameters: currency (usd, eur, gbp, xau)

returns the market cap of Bitcoin in USD, EUR, GBP, XAU

return type is numeric

### /api/v1/price/:currency/moscowtime
request parameters: currency (usd, eur, gbp, xau)

returns the price of 1 unit in local currency (eg $1) in satoshis

return type is numeric


## Transaction API
### /raw-tx-with-inputs/:txid
request parameters: txid 

returns a json in this format

`
[{"transactions":
  [{"in_active_chain":true,"txid":"7f49019b60ce2e8346160c71515a7c36509ced196b2d93ed5c866f284fa14942",
    "hash":"bb758923c26952c535f5f48bc3efca932ed35e19aa4ec8dfcec9eb5a47476f94",
    "version":2,"size":194,"vsize":113,"weight":449,"locktime":0,
    "vin":[{"txid":"48cbc4d1c8092a76cbc2a9e07a65a08a491c86af082b7c9681693ef0e1397f53","vout":0,"scriptSig":{"asm":"","hex":""},
    "txinwitness":["304402203da4ee26b825befec7d37389f8622da8275156d1f42f1bc9002e5faf3a837b0302203293ab5b6ad058a258b0ad0fb4cd1db152f1e832b4f19f041762372009fc62bd01","02e2c996310aa9e62d8495dff2b917030bdfbed529300b0b340ff3022564b23d28"],
    "sequence":4294967295}],
    "vout":[{"value":0.002535,"n":0,"scriptPubKey":{"asm":"OP_DUP OP_HASH160 6d118d674bee8e78a3522c5d884853af79660c0c OP_EQUALVERIFY OP_CHECKSIG","hex":"76a9146d118d674bee8e78a3522c5d884853af79660c0c88ac","reqSigs":1,
    "type":"pubkeyhash","addresses":["1AwhgUBg7ew6jcCpiun5zJXDmJMqo38HBh"]}}],
    "hex":"02000000000101537f39e1f03e6981967c2b08af861c498aa0657ae0a9c2cb762a09c8d1c4cb480000000000ffffffff013cde0300000000001976a9146d118d674bee8e78a3522c5d884853af79660c0c88ac0247304402203da4ee26b825befec7d37389f8622da8275156d1f42f1bc9002e5faf3a837b0302203293ab5b6ad058a258b0ad0fb4cd1db152f1e832b4f19f041762372009fc62bd012102e2c996310aa9e62d8495dff2b917030bdfbed529300b0b340ff3022564b23d2800000000",
    "blockhash":"0000000000000000000d45158b5ba8363e724bbb9544e4ff827a9f076ac4703f",
    "confirmations":1,"time":1620174086,"blocktime":1620174086}],"txInputsByTransaction":{}}]
`
