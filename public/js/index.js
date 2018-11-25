$(document).ready(function () {

    let latestBlock = $('#block-0').text();
    latestBlock = latestBlock.replace(/\,/g, '');
    latestBlock = parseInt(latestBlock);

    let timestamps = null;
    let timeago = null;


    setInterval(function () {


        timestamps = $('.block-timestamp');
        timeago = $('.block-time-ago');

        for(let i = 0; i < timestamps.length; i++) {
            let timestamp = timestamps[i].innerText;
            timeago.eq(i).html(Math.round((Date.now() - timestamp)/1000/60) + " min");
        }



        $.get('/newblocks', {blockHeight: latestBlock + 1})
            .done(data => {

                if(!jQuery.isEmptyObject(data)) {

                    if(data.currencyValue < 0) {
                        data.currencyValue = 0
                    }

                    let exchangeRate = '';
                    if(data.exchangeRate) {
                        exchangeRate = data.exchangeRate;
                        let formatExchangedCurrency = data.formatExchangedCurrency;

                        exchangeRate = '<span></span><span data-toggle="tooltip" title="' + formatExchangedCurrency + '"><i class="fas fa-exchange-alt"></i></span>'
                    }

                    if(data.miner !== '?') {
                        data.miner = '<span class="tag" data-toogle="tooltip" title="Identified by: ' + data.miner.identifiedBy + '">' + data.miner.name + '</span>';
                    }

                    $('#block-list').prepend(
                        '<tr>' +
                        '<td class="data-cell monospace"><a href="/block-height/' + data.height_number + '">' + data.height + '</a></td>' +
                        '<td class="data-cell monospace">' + data.time + '<span class="d-none block-timestamp">' + data.timeUTC + '</span>' +'</td>' +
                        '<td class="data-cell monospace text-right block-time-ago">' + data.timeAgo + '</td>' +
                        '<td class="data-cell monospace"><span>' + data.miner + '</span></td>' +
                        '<td class="data-cell monospace text-right">' + data.transactions + '</td>' +
                        '<td class="data-cell monospace text-right"><span class="monospace">' + data.currencyValueFormatted + ' ' + exchangeRate + '</span></td>' +
                        '<td class="data-cell monospace text-right">' + data.size + '</td>' +
                        '<td class="data-cell monospace text-right"><span>' + data.weight + '</span>' +
                        '<div class="radial-progress" data-progress="' + parseInt(data.radialProgressBarPercent) + '" data-toggle="tooltip" title="' + data.radialProgressBarPercent + '% full">' +
                            '<div class="circle">' +
                                '<div class="mask-full">' +
                                    '<div class="fill"></div>' +
                                '</div>' +
                                '<div class="mask-half">' +
                                    '<div class="fill"></div>' +
                                    '<div class="fill-mix"></div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="inset">' +
                            '</div>' +
                        '</div>' +
                        '</td>' +
                        '</tr>'
                    );

                    $('[data-toggle="tooltip"]').tooltip('dispose');
                    $('[data-toggle="tooltip"]').tooltip();
                    //$('[data-toggle="popover"]').popover({html:true, container:"body"});
                    //$("[data-toggle='toggle']").toggle();

                    latestBlock = latestBlock + 1;
                }

            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.log(textStatus, errorThrown);
            });

    }, 5000);
});