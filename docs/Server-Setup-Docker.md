### Setup of https://rpcexplorer.groestlcoin.org/ on Ubuntu 20.04

	# update and install packages
	apt update
	apt upgrade
	apt install docker.io

	# get source, npm install
	git clone https://github.com/groestlcoin/grs-rpc-explorer.git
	cd grs-rpc-explorer

	# build docker image
	docker build -t grs-rpc-explorer .

	# run docker image: detached mode, share port 3002, sharing config dir, from the "grs-rpc-explorer" image made above
	docker run --name=grs-rpc-explorer -d -v /host-os/env-dir:/container/env-dir --network="host" grs-rpc-explorer
