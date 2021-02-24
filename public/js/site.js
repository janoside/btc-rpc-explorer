function updateCurrencyValue(element, val) {
	$.ajax({
		url: `./snippet/formatCurrencyAmount/${val}`

	}).done(function(result) {
		element.html(result);
		$('[data-toggle="tooltip"]').tooltip();
	});
}

function updateFeeRateValue(element, val, digits) {
	$.ajax({
		url: `./api/utils/formatCurrencyAmountInSmallestUnits/${val},${digits}`

	}).done(function(result) {
		element.html(`<span>${result.val} <small>${result.currencyUnit}/vB</small></span>`);
	});
}

function showAllTxOutputs(link, txid) {
	var hiddenRows = document.querySelectorAll("[data-txid='" + txid + "']");
	hiddenRows.forEach(function(hiddenRow) {
		hiddenRow.classList.remove("d-none");
	});

	link.classList.add("d-none");
}