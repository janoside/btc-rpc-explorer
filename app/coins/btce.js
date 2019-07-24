var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

var currencyUnits = [
	{
		type:"native",
		name:"BTCE",
		multiplier:1,
		default:true,
		values:["", "btcee", "BTCEE"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"mBTCE",
		multiplier:1000,
		values:["mbtce"],
		decimalPlaces:5
	},
	{
		type:"native",
		name:"bitce",
		multiplier:1000000,
		values:["bitce"],
		decimalPlaces:2
	},
	{
		type:"native",
		name:"btceshi",
		multiplier:100000000,
		values:["btceshi", "bshi"],
		decimalPlaces:0
	},
	{
		type:"exchanged",
		name:"USD",
		multiplier:"usd",
		values:["usd"],
		decimalPlaces:2,
		symbol:"$"
	},
	{
		type:"exchanged",
		name:"EUR",
		multiplier:"eur",
		values:["eur"],
		decimalPlaces:2,
		symbol:"
	},
];

module.exports = {
	name:"BitcoinECC",
	ticker:"BTCE",
	logoUrl:"/img/logo/btce.svg",
	siteTitle:"BitcoinECC Explorer",
	nodeTitle:"BitcoinECC Full Node",
	maxBlockWeight: 4000000,
	targetBlockTimeSeconds: 150,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"BTCE":currencyUnits[0], "mBTCE":currencyUnits[1], "bitce":currencyUnits[2], "btceshi":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [5, 10, 25, 50, 100, 150, 200, 250]
};
