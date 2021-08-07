### Setup of https://rpcexplorer.groestlcoin.org on Ubuntu 20.04

    # update and install packages
    apt update
    apt upgrade
    apt install git nginx gcc g++ make certbot python3-certbot-nginx

    # install NVM from https://github.com/nvm-sh/nvm
    nvm ls-remote

    # install latest node from output of ls-remote above, e.g.:
    nvm install 15.13.0

    npm install -g pm2

    # add user for grs-related stuff
    adduser groestlcoin # leave everything blank if you want

    # prep work for ssl certs
    cd /etc/ssl/certs
    openssl dhparam -out dhparam.pem 4096

    # get nginx config
    wget https://raw.githubusercontent.com/groestlcoin/grs-rpc-explorer/master/docs/rpcexplorer.groestlcoin.org.conf
    mv rpcexplorer.groestlcoin.org.conf /etc/nginx/sites-available/

    # get source, npm install
    git clone https://github.com/groestlcoin/grs-rpc-explorer.git
    cd grs-rpc-explorer
    npm install

    # startup via pm2
    pm2 start bin/www --name "grs-rpc-explorer"

    # get letsencrypt cert
    certbot --nginx -d rpcexplorer.groestlcoin.org
