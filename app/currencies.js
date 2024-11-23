global.currencyTypes = {
	"bkc": {
		id: "bkc",
		type:"native",
		name:"BKC",
		multiplier:1,
		default:true,
		decimalPlaces:8
	},
	"sat": {
		id: "sat",
		type:"native",
		name:"sat",
		multiplier:100000000,
		decimalPlaces:0
	},
	"usd": {
		id: "usd",
		type:"exchanged",
		name:"USD",
		multiplier:"usd",
		decimalPlaces:2,
		symbol:"$"
	},
	"eur": {
		id: "eur",
		type:"exchanged",
		name:"EUR",
		multiplier:"eur",
		decimalPlaces:2,
		symbol:"€"
	},
	"gbp": {
		id: "gbp",
		type:"exchanged",
		name:"GBP",
		multiplier:"gbp",
		decimalPlaces:2,
		symbol:"£"
	},
};

global.currencySymbols = {
	"bkc": "B",
	"usd": "$",
	"eur": "€",
	"gbp": "£"
};