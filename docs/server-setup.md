### Setup of bch-rpc-explorer on Ubuntu 18.04 server

    sudo add-apt-repository ppa:certbot/certbot
    curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -
    VERSION=node_10.x
    DISTRO="$(lsb_release -s -c)"
    echo "deb https://deb.nodesource.com/$VERSION $DISTRO main" | sudo tee /etc/apt/sources.list.d/nodesource.list
    echo "deb-src https://deb.nodesource.com/$VERSION $DISTRO main" | sudo tee -a /etc/apt/sources.list.d/nodesource.list
    sudo apt update
    sudo apt upgrade
    sudo apt install git software-properties-common nginx gcc g++ make nodejs
    sudo npm install pm2 --global
    apt install python-certbot-nginx

Copy content from [./bch-explorer.conf](./bch-explorer.conf) into `/etc/nginx/sites-available/bch-explorer.conf`

    certbot --nginx -d bch-explorer.com #use your domain name here
    cd /home/bitcoin
    git clone https://github.com/sickpig/bch-rpc-explorer.git
    cd /home/bitcoin/bch-rpc-explorer
    npm install
    pm2 start bin/www --name "bch-rpc-explorer"
