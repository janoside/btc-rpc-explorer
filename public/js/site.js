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
		url: `./api/utils/formatCurrencyAmountInSmallestUnits/${val},${digits}`

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
// with https
/*function copyTextToClipboard(text) {
	navigator.clipboard.writeText(text).then(() => {}, (err) => {
		console.error('Error copying text: ', err);
	});
}*/
function copyTextToClipboard(text) {
    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        // navigator clipboard api method'
        return navigator.clipboard.writeText(text);
    } else {
        // text area method
        let textArea = document.createElement("textarea");
        textArea.value = text;
        // make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            // here the magic happens
            document.execCommand('copy') ? res() : rej();
            textArea.remove();
        });
    }
}