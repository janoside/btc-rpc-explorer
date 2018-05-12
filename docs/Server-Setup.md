### Setup of https://btc-explorer.com on Ubuntu 16.04

    apt update
    apt upgrade
    apt install git python-software-properties software-properties-common nginx gcc g++ make
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    apt install -y nodejs
    npm install pm2 --global
    add-apt-repository ppa:certbot/certbot
    apt update
    apt upgrade
    apt install python-certbot-nginx
    
Copy content from [./btc-explorer.com.conf](./btc-explorer.com.conf) into `/etc/nginx/sites-available/btc-explorer.com.conf`

    certbot --nginx -d btc-explorer.com
    cd /etc/ssl/certs
    openssl dhparam -out dhparam.pem 4096
    cd /home/bitcoin
    git clone https://github.com/janoside/btc-rpc-explorer.git
    cd /home/bitcoin/btc-rpc-explorer
    npm install
    pm2 start bin/www --name "btc-rpc-explorer"
