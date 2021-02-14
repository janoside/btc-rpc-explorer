var debug = require("debug");
var electrumAddressApi = require("./electrumAddressApi.js");

async function setup(config, activeBlockchain) {
  try { var { BwtDaemon } = require('libbwt'); }
  catch (_) { throw new Error('The bwt backend requires installing the "libbwt" package'); }

  var network = { main: 'bitcoin', test: 'testnet' }[activeBlockchain] || activeBlockchain;
  var rpcCred = config.credentials.rpc;
  var rpcUrl = `http://${rpcCred.host}:${rpcCred.port}`;

  var bwt = await BwtDaemon({
    network,
    bitcoind_url: rpcUrl,
    verbose: +debug.enabled('bwt'),
    progress: reportProgress,
    electrum: true,

    ...getEnvOptions(),
    ...getAuthOptions(rpcCred),
    ...getDescsXpubsOptions(),
  }).start();

  var [ host, port ] = bwt.electrum_addr.split(':');
  config.electrumXServers = [{ host, port, protocol: 'tcp' }];

  await electrumAddressApi.connectToServers();
}

function reportProgress(type, progress, { eta }) {
  if (type == 'scan') console.log('[bwt] Rescan in progress... (%f%%, eta %d minutes)', (progress*100).toFixed(1), (eta/60).toFixed(1))
}

function getEnvOptions() {
  return [ 'bitcoind_wallet', 'rescan_since', 'verbose', 'gap_limit', 'initial_import_size', 'poll_interval' ]
    .reduce((O, name, idx) => {
      var envVal = process.env[`BTCEXP_BWT_${name.toUpperCase()}`];
      if (envVal != null) O[name] = idx <= 1 ? envVal : +envVal;
      return O;
    }, {});
}

function getAuthOptions(rpcCred) {
  return rpcCred.username
    ? { bitcoind_auth: `${rpcCred.username}:${rpcCred.password}` }
    : { bitcoind_cookie: rpcCred.cookie }
}

function getDescsXpubsOptions() {
  var options = { descriptors: [], xpubs: [], bare_xpubs: [] };

  var argTypes = { '--descriptor': options.descriptors, '--xpub': options.xpubs, '--bare-xpub': options.bare_xpubs };
  process.argv.slice(0, -1).forEach((arg, i) => {
    var tList = argTypes[arg];
    if (tList) tList.push(process.argv[i+1]);
  });

  var envTypes = { 'DESCRIPTORS': options.descriptors, 'XPUBS': options.xpubs, 'BARE_XPUBS': options.bare_xpubs };
  Object.entries(envTypes).forEach(([ envName, tList ]) => {
    var envVal = process.env[`BTCEXP_BWT_${envName}`];
    if (envVal) tList.push(...envVal.split(';'))
  });

  return options;
}

module.exports = { setup }
