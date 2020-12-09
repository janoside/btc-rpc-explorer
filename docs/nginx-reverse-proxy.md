Instructions for nginx reverse proxy, accessible via https (thanks [@leshacat](https://github.com/leshacat))

* `sudo apt -y install nginx-full python-certbot-nginx`
* Edit `/etc/nginx/sites-available/default`

Leave the default config, scroll to the bottom, paste in at bottom and edit:
```
upstream explorer-servers {
	ip_hash;
	server srv1.example.com:3000 max_fails=1 weight=4;	
	server srv2.example.com:3000 max_fails=1 weight=2;
	server srv3.example.com:3000 max_fails=1 weight=1;		
}

server {
	server_name explorer.example.com; # managed by Certbot
	
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header X-Forwarded-Proto $scheme;
	proxy_set_header X-Forwarded-Ssl on;

	location / {

		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $host;

		proxy_pass http://explorer-servers;

		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";

		listen 80 default_server;
		listen [::]:80 default_server;

	}
```

* `systemctl enable nginx`
*  `systemctl restart nginx`
* `certbot --nginx -d explorer.example.com`
