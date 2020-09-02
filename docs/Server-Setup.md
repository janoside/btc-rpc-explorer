### Setup of https://explorer.btc21.org on Ubuntu 20.04

    # update and install packages
    apt update
    apt upgrade
    apt install git nginx gcc g++ make npm certbot python3-certbot-nginx
    npm install -g npm
    npm install -g pm2
    
    # add user for btc-related stuff
    adduser bitcoin # leave everything blank if you want
    
    # prep work for ssl certs
    cd /etc/ssl/certs
    openssl dhparam -out dhparam.pem 4096
    
    # get nginx config
    wget https://raw.githubusercontent.com/janoside/btc-rpc-explorer/master/docs/explorer.btc21.org.conf
    mv explorer.btc21.org.conf /etc/nginx/sites-available/

    # get source, npm install
    cd /home/bitcoin
    git clone https://github.com/janoside/btc-rpc-explorer.git
    cd /home/bitcoin/btc-rpc-explorer
    npm install
    
    # startup via pm2
    pm2 start bin/www --name "btc-rpc-explorer"
    
    # get letsencrypt cert
    certbot --nginx -d explorer.btc21.org
