### Setup of https://bitcoinexplorer.org on Ubuntu 20.04

	# update and install packages
	apt update
	apt upgrade
	apt install docker.io
	
	# get source, npm install
	git clone https://github.com/janoside/btc-rpc-explorer.git
	cd btc-rpc-explorer
	
	# build docker image
	docker build -t btc-rpc-explorer .

	# run docker image: detached mode, share port 3002, sharing config dir, from the "btc-rpc-explorer" image made above
	docker run --name=btc-rpc-explorer -d -v /host-os/env-dir:/container/env-dir --network="host" btc-rpc-explorer
	