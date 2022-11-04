module.exports = {
	items: [
		{
			type: "blockheight",
			date: "2009-01-03",
			chain: "main",
			blockHeight: 0,
			blockHash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
			summary: "The Bitcoin Genesis Block.",
			alertBodyHtml: "This is the first block in the Bitcoin blockchain, known as the <b>Genesis Block</b>. This block was mined by Bitcoin's creator <b>Satoshi Nakamoto</b>.<br/>Read more here: <a href='https://en.bitcoin.it/wiki/Genesis_block'>bitcoin.it/wiki/Genesis_block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2009-01-03",
			chain: "main",
			txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			blockHeight: 0,
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the <b>coinbase transaction</b> of the <a href='./block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'>Bitcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},
		{
			type: "tx",
			date: "2010-07-29",
			chain: "main",
			txid: "e411dbebd2f7d64dafeef9b14b5c59ec60c36779d43f850e5e347abee1e1a455",
			blockHeight: 71036,
			summary: "Early transaction with MANY (4,000+) OP_CHECKSIG commands, before this DoS vector was fixed.",
			alertBodyHtml: "Multiple transactions in Block #71,036, including this one, included MANY OP_CHECKSIG commands, causing nodes to perform unnecessary work, and helped identify a possible denial-of-service (DoS) attack. A new version of Bitcoin was quickly released. The new version did not cause a fork on the main network, though it did cause one on the test network (where someone had played around with the attack more)." ,
			referenceUrl: "https://en.bitcoin.it/wiki/Common_Vulnerabilities_and_Exposures#CVE-2010-5138"
		},
		{
			type: "tx",
			date: "2009-10-12",
			chain: "main",
			txid: "7dff938918f07619abd38e4510890396b1cef4fbeca154fb7aafba8843295ea2",
			blockHeight: 24835,
			summary: "First bitcoin traded for fiat currency.",
			alertBodyHtml: "In this first-known BTC-to-fiat transaction, 5,050 BTC were exchanged for 5.02 USD, at an effective exchange rate of ~0.001 USD/BTC.",
			referenceUrl: "https://twitter.com/marttimalmi/status/423455561703624704"
		},
		{
			type:"address",
			date:"2013-09-13",
			chain: "main",
			address:"37k7toV1Nv4DfmQbmZ8KuZDQCYK9x5KpzP",
			summary:"SHA1 collision bounty",
			alertBodyHtml:"This address corresponds to a Bitcoin Script (<span class='font-data'>6e879169a77ca787</span>) that allows anyone who can demonstrate a SHA1 collision to spend from it. On September 13, 2013 this address was funded as a SHA1-collision bounty and it continued to accumulate 'bounty donations' for over 2 years when, on February 23, 2017 a total of 1.62 BTC were spent from this address in <a href='./tx/8d31992805518fd62daa3bdd2a5c4fd2cd3054c9b3dca1d78055e9528cff6adc'>8d31992805...</a>.",
			referenceUrl:"https://bitcointalk.org/index.php?topic=293382.0"
		},
		{
			type:"address",
			date:"2013-09-13",
			chain: "main",
			address:"35Snmmy3uhaer2gTboc81ayCip4m9DT4ko",
			summary:"SHA256 collision bounty",
			alertBodyHtml:"This address corresponds to a Bitcoin Script (<span class='font-data'>6e879169a87ca887</span>) that allows anyone who can demonstrate a SHA256 collision to spend from it. On September 13, 2013 this address was funded as a SHA256-collision bounty. It has continued to accumulate 'bounty donations' for 7+ years and, as of this writing (April 2021), the bounty remains uncollected.",
			referenceUrl:"https://bitcointalk.org/index.php?topic=293382.0"
		},
		{
			type:"address",
			date:"2013-09-13",
			chain: "main",
			address:"3KyiQEGqqdb4nqfhUzGKN6KPhXmQsLNpay",
			summary:"RIPEMD160 collision bounty",
			alertBodyHtml:"This address corresponds to a Bitcoin Script (<span class='font-data'>6e879169a67ca687</span>) that allows anyone who can demonstrate a RIPEMD160 collision to spend from it. On September 13, 2013 this address was funded as a RIPEMD160-collision bounty. It has continued to accumulate 'bounty donations' for 7+ years and, as of this writing (April 2021), the bounty remains uncollected.",
			referenceUrl:"https://bitcointalk.org/index.php?topic=293382.0"
		},
		{
			type:"address",
			date:"2013-09-13",
			chain: "main",
			address:"39VXyuoc6SXYKp9TcAhoiN1mb4ns6z3Yu6",
			summary:"RIPEMD160(SHA256()) collision bounty",
			alertBodyHtml:"This address corresponds to a Bitcoin Script (<span class='font-data'>6e879169a97ca987</span>) that allows anyone who can demonstrate a RIPEMD160(SHA256()) collision to spend from it. On September 13, 2013 this address was funded as a RIPEMD160(SHA256())-collision bounty. It has continued to accumulate 'bounty donations' for 7+ years and, as of this writing (April 2021), the bounty remains uncollected.",
			referenceUrl:"https://bitcointalk.org/index.php?topic=293382.0"
		},
		{
			type:"address",
			date:"2013-09-13",
			chain: "main",
			address:"3DUQQvz4t57Jy7jxE86kyFcNpKtURNf1VW",
			summary:"SHA256(SHA256()) collision bounty",
			alertBodyHtml:"This address corresponds to a Bitcoin Script (<span class='font-data'>6e879169aa7caa87</span>) that allows anyone who can demonstrate a SHA256(SHA256()) collision to spend from it. On September 13, 2013 this address was funded as a SHA256(SHA256())-collision bounty. It has continued to accumulate 'bounty donations' for 7+ years and, as of this writing (April 2021), the bounty remains uncollected.",
			referenceUrl:"https://bitcointalk.org/index.php?topic=293382.0"
		},
		{
			type: "blockheight",
			date: "2017-08-24",
			chain: "main",
			blockHeight: 481824,
			blockHash: "0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893",
			summary: "First SegWit block.",
			referenceUrl: "https://twitter.com/conio/status/900722226911219712"
		},
		{
			type: "blockheight",
			date: "2012-11-28",
			chain: "main",
			blockHeight: 210000,
			blockHash: "000000000000048b95347e83192f69cf0366076336c639f9b7228e9ba171342e",
			summary: "First block of subsidy era #2 (25 BTC).",
			referenceUrl: "https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp#L1240"
		},
		{
			type: "tx",
			date: "2015-07-07",
			chain: "main",
			txid: "bb41a757f405890fb0f5856228e23b715702d714d59bf2b1feb70d8b2b4e3e08",
			blockHeight: 364292,
			summary: "The Megatransaction",
			alertBodyHtml: "This transaction filled the entire 1MB block, mostly sweeping weak brainwallets. At the time, it needed 25 seconds to validate.",
			referenceUrl: "https://rusty.ozlabs.org/?p=522"
		},
		{
			type: "blockheight",
			date: "2016-07-09",
			chain: "main",
			blockHeight: 420000,
			blockHash: "000000000000000002cce816c0ab2c5c269cb081896b7dcb34b8422d6b74ffa1",
			summary: "First block of subsidy era #3 (12.5 BTC).",
			referenceUrl: "https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp#L1240"
		},
		{
			type: "blockheight",
			date: "2020-05-11",
			chain: "main",
			blockHeight: 630000,
			blockHash: "000000000000000000024bead8df69990852c202db0e0097c1a12ea637d7e96d",
			summary: "First block of subsidy era #4 (6.25 BTC).",
			referenceUrl: "https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp#L1240"
		},
		{
			type: "blockheight",
			date: "2020-05-11",
			chain: "main",
			blockHeight: 629999,
			blockHash: "0000000000000000000d656be18bb095db1b23bd797266b0ac3ba720b1962b1e",
			summary: "'Times 09/Apr/2020 With $2.3T Injection, Fed's Plan Far Exceeds 2008 Rescue'",
			alertBodyHtml: "With the coinbase message 'Times 09/Apr/2020 With $2.3T Injection, Fed's Plan Far Exceeds 2008 Rescue', this final block of subsidy era #3 (12.5 BTC) echoes the spiritual call-to-action of <a href='./block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'>Satoshi's genesis block</a>.",
		},
		{
			type: "tx",
			date: "2017-08-24",
			chain: "main",
			txid: "8f907925d2ebe48765103e6845c06f1f2bb77c6adc1cc002865865eb5cfd5c1c",
			blockHeight: 481824,
			summary: "First SegWit transaction.",
			referenceUrl: "https://twitter.com/KHS9NE/status/900553902923362304"
		},
		{
			type: "tx",
			date: "2014-06-16",
			chain: "main",
			txid: "143a3d7e7599557f9d63e7f224f34d33e9251b2c23c38f95631b3a54de53f024",
			blockHeight: 306204,
			summary: "Star Wars: A New Hope",
			referenceUrl: ""
		},
		{
			type: "tx",
			date: "2010-05-22",
			chain: "main",
			txid: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
			blockHeight: 57043,
			summary: "The \"Bitcoin Pizza\" transaction.",
			alertBodyHtml: "This is the famous \"Bitcoin Pizza\" transaction, one of the earliest real-world transactions, in which 10,000 BTC was paid for 2 large pizzas worth ~41 USD (at an effective exchange rate of ~$0.004/BTC).",
			referenceUrl: "https://bitcointalk.org/index.php?topic=137.0"
		},
		{
			type: "tx",
			date: "2011-05-18",
			chain: "main",
			txid: "5d80a29be1609db91658b401f85921a86ab4755969729b65257651bb9fd2c10d",
			blockHeight: 124724,
			summary: "Midnightmagic's 'Missing Satoshi' (provably lost/destroyed bitcoin)",
			alertBodyHtml: "The miner of block <a href='./block-height/124724'>124,724</a> (<a href='https://bitcointalk.org/index.php?action=profile;u=2759'>midnightmagic on BitcoinTalk</a>) deliberately underpaid themselves 1 satoshi from the block subsidy (in addition to deliberately ignoring the fees for transactions included in that block). The 'missing satoshi' (to use midnight magic's words), was a tribute to Satoshi's disappearance.",
			referenceUrl: "https://bitcointalk.org/index.php?topic=7253.msg184414#msg184414",
			referenceUrl2: "https://www.reddit.com/r/Bitcoin/comments/7mhoks/til_in_2011_a_user_running_a_modified_mining/"
		},
		{
			type: "blockheight",
			date: "2009-01-12",
			chain: "main",
			blockHeight: 170,
			blockHash: "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
			summary: "First block containing a (non-coinbase) transaction.",
			alertBodyHtml: "This block comes 9 days after the genesis block and is the first to contain a transfer of bitcoin. Before this block all blocks contained only coinbase transactions, which mint new bitcoin.<br/>See transaction #1 (f4184fc…) below for more info.",
			referenceUrl: "https://bitcointalk.org/index.php?topic=91806.msg1012234#msg1012234"
		},
		{
			type: "tx",
			date: "2009-01-12",
			chain: "main",
			txid: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
			blockHeight: 170,
			summary: "The first transfer of bitcoin.",
			alertBodyHtml: "This transaction represents the first ever transfer of bitcoin from one person to another. It also has the added distinction of being (one of?) the only known transfers of bitcoin from Satoshi Nakamoto, in this case sending bitcoin to Hal Finney as a test."
		},
		{
			type: "blockheight",
			date: "2017-08-25",
			chain: "main",
			blockHeight: 481947,
			blockHash: "00000000000000000139cb443e16442fcd07a4a0e0788dd045ee3cf268982016",
			summary: "First block mined that was greater than 1MB.",
			referenceUrl: "https://en.bit.news/bitfury-mined-first-segwit-block-size-1-mb/"
		},
		{
			type: "blockheight",
			date: "2018-01-20",
			chain: "main",
			blockHeight: 505225,
			blockHash: "0000000000000000001bbb529c64ddf55edec8f4ebc0a0ccf1d3bb21c278bfa7",
			summary: "First block mined that was greater than 2MB.",
			referenceUrl: "https://twitter.com/BitGo/status/954998877920247808"
		},
		{
			type: "tx",
			date: "2017-12-30",
			chain: "main",
			txid: "9bf8853b3a823bbfa1e54017ae11a9e1f4d08a854dcce9f24e08114f2c921182",
			blockHeight: 501726,
			summary: "Block reward lost",
			alertBodyHtml: "This coinbase transaction completely fails to collect the block's mining reward. 12.5 BTC were lost.",
			referenceUrl: "https://bitcoin.stackexchange.com/a/67012/3397"
		},
		{
			type:"address",
			date:"2011-12-03",
			chain: "main",
			address:"1JryTePceSiWVpoNBU8SbwiT7J4ghzijzW",
			summary:"Brainwallet address for 'Satoshi Nakamoto'",
			referenceUrl:"https://twitter.com/MrHodl/status/1041448002005741568",
			alertBodyHtml:"This address was generated from the SHA256 hash of 'Satoshi Nakamoto' as example of the 'brainwallet' concept."
		},
		{
			type: "tx",
			date: "2010-11-14",
			chain: "main",
			txid: "e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468",
			blockHeight: 91880,
			summary: "Duplicated coinbase transaction #1",
			referenceUrl: "https://bitcoin.stackexchange.com/questions/38994/will-there-be-21-million-bitcoins-eventually/38998#38998",
			alertBodyHtml: "This is one of 2 'duplicate coinbase' transactions. An early bitcoin bug (fixed by <a href='https://github.com/bitcoin/bips/blob/master/bip-0030.mediawiki'>BIP30</a>) allowed identical coinbase transactions - a newer duplicate would overwrite older copies. This transaction was the coinbase transaction for <a href='./block-height/91722'>Block #91,722</a> and, ~16 hours later, <a href='./block-height/91880'>Block #91,880</a>. The 50 BTC claimed as the coinbase for block 91,722 were also overwritten and lost."
		},
		{
			type: "tx",
			date: "2010-11-14",
			chain: "main",
			txid: "d5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599",
			blockHeight: 91842,
			summary: "Duplicated coinbase transaction #2",
			referenceUrl: "https://bitcoin.stackexchange.com/questions/38994/will-there-be-21-million-bitcoins-eventually/38998#38998",
			alertBodyHtml: "This is one of 2 'duplicate coinbase' transactions. An early bitcoin bug (fixed by <a href='https://github.com/bitcoin/bips/blob/master/bip-0030.mediawiki'>BIP30</a>) allowed identical coinbase transactions - a newer duplicate would overwrite older copies. This transaction was the coinbase transaction for <a href='./block-height/91812'>Block #91,812</a> and, ~3 hours later, <a href='./block-height/91842'>Block #91,842</a>. The 50 BTC claimed as the coinbase for block 91,812 were also overwritten and lost."
		},
		{
			type: "tx",
			date: "2020-03-11",
			chain: "main",
			txid: "eeea72f5c9fe07178013eac84c3705443321d5453befd7591f52d22ac39b3963",
			blockHeight: 621259,
			summary: "500+ million USD transferred for < 1 USD fee (2020 prices)."
		},
		{
			type: "tx",
			date: "2020-05-20",
			chain: "main",
			txid: "cb1440c787d8a46977886405a34da89939e1b04907f567bf182ef27ce53a8d71",
			blockHeight: 631058,
			summary: "Very old coins (mined ~1 month after genesis) move unexpectedly, causing uproar",
			alertBodyHtml: "On May 5, 2020, 50 BTC mined on Feb 9, 2009 (~1 month after Satoshi mined the Genesis block), moved unexpectedly after being dormant for 11+ years. Some observers wondered if they were coins from Satoshi's stash (they likely <a href='https://twitter.com/zackvoell/status/1263120133054255104'>were not</a>) and got excited.",
			referenceUrl: "https://twitter.com/WhalePanda/status/1263120678380867586"
		},
		{
			type: "address",
			date: "2020-07-15",
			chain: "main",
			address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
			summary: "July 2020 Twitter hack BTC address",
			alertBodyHtml: "On July 15, 2020 a hack involving many prominent Twitter accounts, including Elon Musk's, Bill Gates', and Cash App's, scammed many people to send BTC to this address.",
			referenceUrl: "https://twitter.com/lawmaster/status/1283694581926723585"
		},
		{
			type: "tx",
			date: "2011-11-16",
			chain: "main",
			txid: "29a3efd3ef04f9153d47a990bd7b048a4b2d213daaa5fb8ed670fb85f13bdbcf",
			blockHeight: 153509,
			summary: "The current largest output transaction.",
			alertBodyHtml: "This transaction from November 2011 spends 11 UTXOs worth 50,000 BTC to create a single 550,000 BTC UTXO. This is currently the largest output transaction.",
			referenceUrl: "https://blockchair.com/bitcoin/transactions?s=output_total(desc)#"
		},
		{
			type: "tx",
			date: "2013-04-06",
			chain: "main",
			txid: "54e48e5f5c656b26c3bca14a8c95aa583d07ebe84dde3b7dd4a78f4e4186e713",
			blockHeight: 230009,
			summary: "The Bitcoin whitepaper embedded in the Bitcoin blockchain.",
			alertBodyHtml: "This transaction encodes the Bitcoin whitepaper PDF in 945 of its 947 outputs. You can view the PDF, decoded from data served by your own node here: <a href='./bitcoin-whitepaper'>bitcoin whitepaper</a>. Or read more about the technical details - ",
			referenceUrl: "https://bitcoin.stackexchange.com/questions/35959/how-is-the-whitepaper-decoded-from-the-blockchain-tx-with-1000x-m-of-n-multisi"
		},
		{
			type: "link",
			date: "2021-01-31",
			chain: "main",
			address: "1Hf2CKoVDyPj7dNn3vgTeFMgDqVvbVNZQq",
			url: "./address/1Hf2CKoVDyPj7dNn3vgTeFMgDqVvbVNZQq?sort=asc&limit=2&offset=11",
			summary: "Transaction output values used to encode botnet command-and-control IP address",
			alertBodyHtml: "Two of the transactions sent to this address encode the IP address of a botnet's command-and-control server. Using the censorship-resistant Bitcoin network to serve this data makes the botnet more resistant to takedown. The output value '6957' (in transaction <a href='./tx/35ef7fa5dd1e4d572279a74a83082bd3e77a0c3a468723b5def5d014ed634e84'>35ef7fa5dd…</a>) and the output value '36305' (in transaction <a href='./tx/3a1fcdea5495fb3a1aa410772860afd7841ba8830ffc0ab474d4d69458244e42'>3a1fcdea54…</a>) combine to encode the IPv4 address '209.141.45.27'.",
			referenceUrl: "https://arstechnica.com/information-technology/2021/02/crooks-use-the-bitcoin-blockchain-to-protect-their-botnets-from-takedown/"
		},
				{
			type: "blockheight",
			date: "2013-03-24",
			chain: "main",
			blockHeight: 227835,
			blockHash: "00000000000001aa077d7aa84c532a4d69bdbff519609d1da0835261b7a74eb6",
			summary: "The last 'Version 1' block.",
			alertBodyHtml: "This block was the last 'Version 1' block to be mined. <a href='https://github.com/bitcoin/bips/blob/master/bip-0034.mediawiki'>BIP-34</a> defined 'Version 2' blocks and the 'bip34' soft fork was officially locked in 96 blocks after this one, in block #<a href='./block-height/227931'>227,931</a>.",
			referenceUrl: "https://github.com/bitcoin/bips/blob/master/bip-0034.mediawiki"
		},
		{
			type: "tx",
			date: "2013-11-05",
			chain: "main",
			txid: "d29c9c0e8e4d2a9790922af73f0b8d51f0bd4bb19940d9cf910ead8fbe85bc9b",
			blockHeight: 268060,
			summary: "Never gonna give you up...",
			alertBodyHtml: "This transaction includes a 983-byte OP_RETURN output. Although the default max size for OP_RETURN data is often quoted as 80 bytes, the 80-byte limit is a non-consensus rule that can vary from node to node (and is only enforced at mempool-acceptance time).",
			referenceUrl: "https://bitcoin.stackexchange.com/q/78572/3397"
		},
		{
			type: "blockheight",
			date: "2021-01-29",
			chain: "main",
			blockHeight: 668197,
			blockHash: "000000000000000000023c31edf49adb2306d0db74e6f1f032ef76deaa7a464a",
			summary: "In retrospect, it was inevitable",
			alertBodyHtml: "Shortly before a $1B+ USD Tesla treasury investment into Bitcoin was announced, Elon Musk updated his Twitter profile to just say '#Bitcoin' and cryptically tweeted 'It was inevitable'. Miner 'yhc5t3p' with F2Pool immortalized the tweet soon after.",
			referenceUrl: "https://twitter.com/elonmusk/status/1355068728128516101"
		},
		{
			type: "blockheight",
			date: "2021-04-14",
			chain: "main",
			blockHeight: 679187,
			blockHash: "000000000000000000003b1e8108e0d85ad0f698ded94360b27e0ca766682b4f",
			summary: "NYTimes 10/Mar/2021 House Gives Final Approval to Biden's $1.9T Pandemic Relief",
			alertBodyHtml: "In celebration of their public listing and in homage to Satoshi's <a href='./block-height/0'>Genesis Block</a>, @Coinbase asked F2Pool to embed a message in the blockchain: 'NYTimes 10/Mar/2021 House Gives Final Approval to Biden's $1.9T Pandemic Relief'.",
			referenceUrl: "https://twitter.com/coinbase/status/1382338154053607429"
		},
		{
			type: "blockheight",
			date: "2021-06-07",
			chain: "main",
			blockHeight: 686604,
			blockHash: "0000000000000000000ccaca16c648fc1a2dce9749af651f9bf3ab2e778980a9",
			summary: "Diario El Salvador 6/Jun/2021 Bitcoin tendra validez legal",
			alertBodyHtml: "Immortalizing the proposed legislation in El Salvador to classify bitcoin as legal tender in the country (a bill written in collaboration with <a href='https://Strike.me'>Strike.me</a>) Slush Pool embedded the headline: 'Diario El Salvador 6/Jun/2021 Bitcoin tendra validez legal'.",
			referenceUrl: "https://twitter.com/slush_pool/status/1401763623417098243"
		},
		{
			type: "blockheight",
			date: "2021-06-13",
			chain: "main",
			blockHeight: 687455,
			blockHash: "00000000000000000001464428893b618817bff3128a6e17a2c043de53ca4673",
			summary: "Taproot Lock-In via Speedy Trial mechanism.",
			alertBodyHtml: "As the last block of epoch #340, wherein over 90% of blocks were flagged by their miners to indicate Taproot acceptance/readiness, the mining of this block represents the lock-in of the Taproot soft fork on the network via the Speedy Trial activation mechanism. After lock-in, there was a delay period of 11 epochs before nodes began enforcing Taproot's rules in <a href='./block-height/709632'>Block #709,632</a>.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/pull/21686"
		},
		{
			type: "blockheight",
			date: "2021-11-14",
			chain: "main",
			blockHeight: 709632,
			blockHash: "0000000000000000000687bca986194dc2c1f949318629b44bb54ec0a94d8244",
			summary: "The first Taproot-enforcing block",
			alertBodyHtml: "Nearly 4 years after the Taproot upgrade was conceived, and after a contentious process of deciding how to safely upgrade the network, the Taproot soft fork locked in with the mining of <a href='./block-height/687455'>Block #687,455</a> and then finally began to be enforced by nodes in this block.",
			referenceUrl: "https://twitter.com/pwuille/status/1403725170993336322"
		},
		{
			type: "tx",
			date: "2021-11-14",
			chain: "main",
			txid: "777c998695de4b7ecec54c058c73b2cab71184cf1655840935cd9388923dc288",
			blockHeight: 709632,
			summary: "The first (post-activation) Pay-to-Taproot (P2TR) transaction in Bitcoin's history.",
			alertBodyHtml: "Saluting the network's upgrade with a cheerful OP_RETURN message 'gm taproot 🥕', <a href='https://twitter.com/FedericoTenga'>@FedericoTenga</a> overpaid by ~3.3x (a fee rate of ~2,500 sat/vB) for the historic honor of sending the first (post-activation) mainnet Pay-to-Taproot (P2TR) transaction. (Note that there exist several quirky pre-activation P2TR outputs, including <a href='./tx/b53e3bc5edbb41b34a963ecf67eb045266cf841cab73a780940ce6845377f141'>the true 'first-ever' P2TR output</a>.)",
			referenceUrl: "https://twitter.com/FedericoTenga/status/1459755752080519168"
		},
		{
			type: "tx",
			date: "2021-11-14",
			chain: "main",
			txid: "33e794d097969002ee05d336686fc03c9e15a597c1b9827669460fac98799036",
			blockHeight: 709635,
			summary: "The first mainnet spend of a Pay-to-Taproot (P2TR) output.",
			referenceUrl: "https://twitter.com/achow101/status/1459759674723651585"
		},
		{
			type: "tx",
			date: "2021-11-14",
			chain: "main",
			txid: "2eb8dbaa346d4be4e82fe444c2f0be00654d8cfd8c4a9a61b11aeaab8c00b272",
			blockHeight: 709635,
			summary: "The first use of OP_CHECKSIGADD",
			alertBodyHtml: "Created by a modified version of <a href='https://twitter.com/bitcoindevkit'>@bitcoindevkit</a>, this Taproot script-spend with a 1-of-2 multisig is the first mainnet transaction to use OP_CHECKSIGADD.",
			referenceUrl: "https://twitter.com/afilini/status/1459763243556163584"
		},
		{
			type: "tx",
			date: "2021-07-23",
			chain: "main",
			txid: "b10c007c60e14f9d087e0291d4d0c7869697c6681d979c6639dbd960792b4d41",
			blockHeight: 692261,
			summary: "The (real) first mainnet spend of Pay-to-Taproot (P2TR) outputs.",
			alertBodyHtml: "This interesting transaction exists in the blockchain only because of special coordination with F2Pool. Because this transaction spends Pay-to-Taproot outputs, and because it was created before Taproot activation, it was considered \"non-standard\" and would not be relayed across the Bitcoin network, despite technically being valid. Therefore, as a technical demonstration, <a href='https://b10c.me'>https://b10c.me</a> coordinated with F2Pool to mine this non-standard transaction, wherein the P2TR outputs were effectively anyone-can-spend outputs.",
			referenceUrl: "https://b10c.me/blog/007-spending-p2tr-pre-activation/"
		},
		{
			type: "tx",
			date: "2019-12-17",
			chain: "main",
			txid: "b53e3bc5edbb41b34a963ecf67eb045266cf841cab73a780940ce6845377f141",
			blockHeight: 608548,
			summary: "The (real) first mainnet Pay-to-Taproot output.",
			alertBodyHtml: "Created LONG before Taproot lock-in, let alone activation, this transaction's #0 output is the first ever P2TR output. It was created by Matthew Zipkin to test sending support for bech32 witness version 1. Interestingly, this output, along with 3 other pre-Activation P2TR outputs, was also SPENT before activation in <a href='./tx/b10c007c60e14f9d087e0291d4d0c7869697c6681d979c6639dbd960792b4d41'>Transaction b10c007...</a>, which required special coordination with F2Pool.",
			referenceUrl: "https://b10c.me/blog/007-spending-p2tr-pre-activation/"
		},
		{
			type: "tx",
			date: "2021-12-06",
			chain: "main",
			txid: "562ff53512901dfdd0fca0d6b6a79444aad5767db716ece7c0a1bd15482b6384",
			blockHeight: 712928,
			summary: "Far-future dated Locktime value.",
			alertBodyHtml: "The 'locktime' value of a transaction usually specifies the earliest time that a transaction may be mined (included in a block). The value can take one of two forms: a block height (if the value is &leq; 500M), or a unix timestamp. The locktime value of this transaction seemingly indicates that the transaction cannot be mined until the year 2076. But, because this is a coinbase transaction (created by a miner in the process of mining a block), its locktime value does not need to honor the usual purpose, and may instead be representing some other data from the miner. This situation arises fairly regularly in coinbase transactions."
		},
		{
			type: "tx",
			date: "2015-06-21",
			chain: "main",
			txid: "71c3da4e13f5b61c2cf05e9b5a22f3be989142b870c1cf7779a1d7b3f139d422",
			blockHeight: 361935,
			summary: "Value provably destroyed in OP_RETURN output.",
			alertBodyHtml: "OP_RETURN outputs are special-case outputs that immediately abort script evaluation with a failure result. Therefore, any value assigned to an OP_RETURN output is provably unspendable. In fact, as an optimization, such values are purged from node software's databases since they are certain to be unspendable in all future transactions.",
			referenceUrl: "https://bitcoin.stackexchange.com/a/109748/3397"
		},
		{
			type: "tx",
			date: "2022-01-13",
			chain: "main",
			txid: "37d5ec4bca7bd077992a6dd8679ab676a22986e63ebaf2c6ea1aebe5e5f5e817",
			blockHeight: 718448,
			summary: "Unspendable output due to invalid public key.",
			alertBodyHtml: "The Script for Output #0 of this transaction has a public key that does not conform to the <a href='https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki#Public_Key_Generation'>BIP-340</a> specification (\"Schnorr Signatures for secp256k1\"). The value assinged to this output (0.0002 BTC) is therefore burned forever.",
			referenceUrl: "https://suredbits.com/taproot-funds-burned-on-the-bitcoin-blockchain/"
		},
		{
			type: "tx",
			date: "2022-05-18",
			chain: "main",
			txid: "80ab328c77cbd554598c3a7b322af520a77d1687b27badfa969d2c419de785d7",
			blockHeight: 736943,
			summary: "Lightning Network penalty transaction",
			alertBodyHtml: "As a technical experiment and as a playful donation, User <a href='https://twitter.com/fiatjaf'>fiatjaf</a> intentionally created a situation where his lightning node would be penalized and forfeit funds to his channel counterparty. The second input to this transaction represents the penalty close, wherein all of the funds on fiatjaf's side of the channel were forfeited to his counterparty.",
			referenceUrl: "http://fiatjaf.com/73095980.html"
		},
		{
			type: "tx",
			date: "2022-11-01",
			chain: "main",
			txid: "73be398c4bdc43709db7398106609eea2a7841aaf3a4fa2000dc18184faa2a7e",
			blockHeight: 761249,
			summary: "@brqgoo's LND-breaking transaction",
			alertBodyHtml: "This transaction caused grief for multiple Bitcoin software projects (including this one...) It's a very large transaction that includes a huge number of empty input-script witness items. The underlying issue was inconsistency in handling of stack size relating to OP_SUCCESSx opcodes.",
			referenceUrl: "https://github.com/btcsuite/btcd/issues/1906"
		},



		// testnet
		{
			type: "blockheight",
			date: "2011-02-02",
			chain: "test",
			blockHeight: 0,
			blockHash: "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943",
			summary: "The Bitcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Bitcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2011-02-02",
			chain: "test",
			txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			blockHeight: 0,
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='./block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'>Bitcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},


		// regtest
		{
			type: "blockheight",
			date: "2011-02-02",
			chain: "regtest",
			blockHeight: 0,
			blockHash: "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
			summary: "The Bitcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Bitcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2011-02-02",
			chain: "regtest",
			txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			blockHeight: 0,
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='./block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'>Bitcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		}
	]
};
