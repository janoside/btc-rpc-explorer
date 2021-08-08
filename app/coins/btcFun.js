module.exports = {
	items: [
		{
			type: "blockheight",
			date: "2014-03-22",
			chain: "main",
			blockHeight: 0,
			blockHash: "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
			summary: "The Groestlcoin Genesis Block.",
			alertBodyHtml: "This is the first block in the Groestlcoin blockchain, known as the 'Genesis Block'.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2014-03-22",
			chain: "main",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},

		// testnet
		{
			type: "blockheight",
			date: "2015-08-19",
			chain: "test",
			blockHeight: 0,
			blockHash: "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			summary: "The Groestlcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Groestlcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2015-08-19",
			chain: "test",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},


		// regtest
		{
			type: "blockheight",
			date: "2014-03-22",
			chain: "regtest",
			blockHeight: 0,
			blockHash: "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			summary: "The groestlcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Bitcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2014-03-22",
			chain: "regtest",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},
	]
};
