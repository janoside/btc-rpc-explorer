#!/usr/bin/env node

const args = require('meow')(`
    Usage
      $ btc-rpc-explorer [options]

    Options
      -p, --port <port>            port to bind http server [default: 3002]
      --coin <coin>                crypto-coin to enable [default: BTC]

      -H, --bitcoind-host <host>   hostname for bitcoind rpc [default: 127.0.0.1]
      -P, --bitcoind-port <port>   port for bitcoind rpc [default: 8332]
      -c, --bitcoind-cookie <path> path to bitcoind cookie file [default: 8332]
      -u, --bitcoind-user <user>   username for bitcoind rpc [default: none]
      -w, --bitcoind-pass <pass>   password for bitcoind rpc [default: none]

      --cookie-secret <secret>     secret key for signed cookie hmac generation [default: hmac derive from bitcoind pass]
      --demo                       enable demoSite mode [default: disabled]

      --ipstack-key <key>          api access key for ipstack (for geoip) [default: disabled]
      --ganalytics-tracking <tid>  tracking id for google analytics [default: disabled]
      --sentry-url <sentry-url>    sentry url [default: disabled]

      --enable-influxdb            enable influxdb for logging network stats [default: false]
      --influxdb-host <host>       hostname for influxdb [default: 127.0.0.1]
      --influxdb-user <user>       username for influxdb [default: admin]
      --influxdb-pass <pass>       password for influxdb [default: admin]
      --influxdb-dbname <db>       database name for influxdb [default: influxdb]

      -e, --node-env <env>      nodejs environment mode [default: production]
      -h, --help                output usage information
      -v, --version             output version number

    Example
      $ btc-rpc-explorer --port 8080 --bitcoind-port 18443 --bitcoind-cookie ~/.bitcoin/regtest/.cookie
      $ btc-rpc-explorer -p 8080 -P 18443 -c ~/.bitcoin/regtest.cookie

    All options may also be specified as environment variables:
      $ BTCEXP_PORT=8080 BTCEXP_BITCOIND_PORT=18443 BTCEXP_BITCOIND_COOKIE=~/.bitcoin/regtest/.cookie btc-rpc-explorer

`, { flags: { port: {alias:'p'}, enableInfluxdb: {type:'boolean'}, nodeEnv: {alias:'e', default:'production'}
            , bitcoindHost: {alias:'H'}, bitcoindPort: {alias:'P'}, bitcoindCookie: {alias:'c'}
            , bitcoindUser: {alias:'u'}, bitcoindPass: {alias:'w'}
            , demo: {type:'boolean'}
            } }
).flags;

const envify = k => k.replace(/([A-Z])/g, '_$1').toUpperCase();

Object.keys(args).filter(k => k.length > 1).forEach(k => {
  if (args[k] === false) process.env[`BTCEXP_NO_${envify(k)}`] = true;
  else process.env[`BTCEXP_${envify(k)}`] = args[k];
})

require('./www');
