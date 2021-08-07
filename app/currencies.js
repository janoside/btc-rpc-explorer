global.currencyTypes = {
	"grs": {
		id: "grs",
		type:"native",
		name:"GRS",
		multiplier:1,
		default:true,
		decimalPlaces:8
	},
	"gro": {
		id: "gro",
		type:"native",
		name:"gro",
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
	"grs": "Ǥ",
	"usd": "$",
	"eur": "€",
	"gbp": "£"
};
