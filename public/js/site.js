function updateCurrencyValue(element, val) {
	$.ajax({
		url: `./snippet/formatCurrencyAmount/${val}`

	}).done(function(result) {
		element.html(result);
		$('[data-bs-toggle="tooltip"]').tooltip();
	});
}

function updateUserSetting(name, val) {
	$.ajax({
		url: `./changeSetting?name=${name}&value=${val}`

	}).done(res => {});
}

function updateFeeRateValue(element, val, digits, showUnit=true) {
	$.ajax({
		url: `./internal-api/utils/formatCurrencyAmountInSmallestUnits/${val},${digits}`

	}).done(function(result) {
		element.html(`<span>${result.val}${showUnit ? ("<small class='ms-2'>" + result.currencyUnit + "/vB</small>") : ""}</span>`);
	});
}

function showAllTxOutputs(link, txid) {
	var hiddenRows = document.querySelectorAll("[data-txid='" + txid + "']");
	hiddenRows.forEach(function(hiddenRow) {
		hiddenRow.classList.remove("d-none");
	});

	link.classList.add("d-none");
}

function copyTextToClipboard(text) {
	navigator.clipboard.writeText(text).then(() => {}, (err) => {
		console.error('Error copying text: ', err);
	});
}

function iframeLoaded(iframeId) {
	var iframeElement = document.getElementById(iframeId);

	if (iframeElement) {
		iframeElement.height = iframeElement.contentWindow.document.body.scrollHeight + "px";
	}
}
