#!/bin/sh
# wait-for-electrumx.sh

set -e

host="$1"
port="$2"

until nc -z $host $port ; do
  >&2 echo "ElectrumX server is unavailable - sleeping..."
  sleep 5
done

exec npm start
