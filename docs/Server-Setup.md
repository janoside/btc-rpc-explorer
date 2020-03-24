### Setup of https://explorer.btc21.org on Ubuntu 16.04

    apt update
    apt upgrade
    apt install git python-software-properties software-properties-common nginx gcc g++ make
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash
    nvm install 10.14.1 ## LTS release of NodeJS as of 2018-11-29, via https://nodejs.org/en/
    npm install pm2 --global
    add-apt-repository ppa:certbot/certbot
    apt update
    apt upgrade
    apt install python-certbot-nginx
    
Copy content from [./explorer.btc21.org.conf](./explorer.btc21.org.conf) into `/etc/nginx/sites-available/explorer.btc21.org.conf`

    certbot --nginx -d explorer.btc21.org
    cd /etc/ssl/certs
    openssl dhparam -out dhparam.pem 4096
    cd /home/bitcoin
    git clone https://github.com/janoside/btc-rpc-explorer.git
    cd /home/bitcoin/btc-rpc-explorer
    npm install
    npm run build
    pm2 start bin/www --name "btc-rpc-explorer"
