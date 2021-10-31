### Setup of https://rpcexplorer.groestlcoin.org on Ubuntu 20.04

Update and install packages

    apt update
    apt upgrade
    apt install git nginx gcc g++ make python3-certbot-nginx

Install NVM from https://github.com/nvm-sh/nvm

    nvm ls-remote

    # install latest node from output of ls-remote above, e.g.:
    nvm install 15.13.0

    npm install -g pm2

Misc setup

    # add user for grs-related stuff
    adduser groestlcoin # leave everything blank if you want

    # gen self-signed cert
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/selfsigned.key -out /etc/ssl/certs/selfsigned.crt

    # get nginx config
    wget https://raw.githubusercontent.com/groestlcoin/grs-rpc-explorer/master/docs/rpcexplorer.groestlcoin.org.conf
    mv rpcexplorer.groestlcoin.org.conf /etc/nginx/sites-available/rpcexplorer.groestlcoin.org.conf

Get source, npm install

    cd /home/groestlcoin
    git clone https://github.com/groestlcoin/grs-rpc-explorer.git
    cd /home/groestlcoin/grs-rpc-explorer
    npm install

    # startup via pm2
    pm2 start bin/www --name "grs"

    # get letsencrypt cert
    certbot --nginx -d rpcexplorer.groestlcoin.org

Tor setup

    apt install tor

Edit /etc/tor/torrc

1. Uncomment `ControlPort 9051`
2. Uncomment `CookieAuthentication 1`
3. If applicable, add Torv3 Hidden service credentials to `/var/lib/tor/btcexp...onion`
    * chmod 700 for directory, owned by the same "tor" user as other files in that dir
    * chmod 600 for the files in the "btcexp...onion" dir)
5. Add `HiddenServiceDir /var/lib/tor/btcexp...onion/`
6. Add `HiddenServicePort 80 127.0.0.1:3000`


Tor startup

    service tor start

    # verify tor startup
    ps -ef | grep tor

    # verify tor listening on 9050 (proxy) and 9051 (control port)
    netstat -nlp | grep 905
