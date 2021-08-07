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

function ellipsizeMiddle(str, length, replacement="…", extraCharAtStart=true) {
	if (str.length <= length) {
		return str;

	} else {
		if ((length - replacement.length) % 2 == 0) {
			return str.substring(0, (length - replacement.length) / 2) + replacement + str.slice(-(length - replacement.length) / 2);

		} else {
			if (extraCharAtStart) {
				return str.substring(0, Math.ceil((length - replacement.length) / 2)) + replacement + str.slice(-Math.floor((length - replacement.length) / 2));

			} else {
				return str.substring(0, Math.floor((length - replacement.length) / 2)) + replacement + str.slice(-Math.ceil((length - replacement.length) / 2));
			}
			
		}
	}
}

function onLoad_tabSelection() {
	// change url based on selected tab
	const selectableTabList = [].slice.call(document.querySelectorAll('.page-tab a[data-bs-toggle="tab"]'));
	selectableTabList.forEach((selectableTab) => {
		const selTab = new bootstrap.Tab(selectableTab);
		selectableTab.addEventListener('click', function () {
			var newUrl;
			const hash = selectableTab.getAttribute('href');
			const isDefault = selectableTab.getAttribute("data-default-tab");
			
			if (isDefault) {
				newUrl = url.split('#')[0];

			} else {
				newUrl = url.split('#')[0] + hash;
			}

			history.replaceState(null, null, newUrl);
		});
	});

	let url = location.href.replace(/\/$/, '');
	if (location.hash) {
		const hash = url.split('#');
		const currentTab = document.querySelector('#page-tabs .page-tab a[href="#' + hash[1] + '"]');
		bootstrap.Tab.getInstance(currentTab).show();
		
		url = location.href.replace(/\/#/, '#');
		history.replaceState(null, null, url);

		setTimeout(() => {
			window.scrollTop = 0;
		}, 400);
	}

}
