import socket, json

host = '127.0.0.1'
port = 50001  # plain TCP port

query = {
    "id": 1,
    "method": "blockchain.transaction.get",
    "params": ["fd8d6e525f580e0df9ab84eb9eb3c22a23053b84684146c07f9d1d71e20c5354", True]
}

s = socket.create_connection((host, port))
s.send((json.dumps(query) + "\n").encode())

print(s.recv(100000).decode())
