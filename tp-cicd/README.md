# Setup CI/CD on Ubuntu Server

You will need to install

- `supervisor`
- [`webhook`](https://github.com/adnanh/webhook)
- `cloudflared` CLI

## Setup `supervisor`

```bash
sudo apt install supervisor -y
sudo service supervisor start
cd /etc/supervisor/conf.d/
sudo vi project.supervisor.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

## Setup `cloudflared`

- [Install](https://pkg.cloudflare.com/index.html)

- Start

```
cloudflared tunnel login
cloudflared tunnel create TUNNEL_NAME
cloudflared tunnel list
cloudflared tunnel route dns TUNNEL_LONG_NAME fs-g01.iecmu.com
sudo cloudflared --config /home/nirand/.cloudflared/config.yml service install
```

- Stop

```
sudo cloudflared service uninstall &&
sudo rm /etc/cloudflared/config.yml
```

## Setup `Webhook`

- `sudo apt-get install webhook`
- Pull all files in `/etc/webhook` (manually created)
- Give executable permission to script files.
  - `chmod +x script.sh `
- Run manually
  - `webhook -hooks /etc/webhook/hooks.json -verbose`
- Run automatically
  - `sudo service supervisor start`

## Improvement next year

- When running a Docker container, files created inside the container are often owned by root on the host system. This can cause permission issues such as preventing students (non-root users) from deleting or modifying folders like your "pf-deploy" folder.
  - Run the container with the same user ID (UID) and group ID (GID) as the students on the host system. This ensures files are created with their ownership permissions.
  - Use the Docker --user flag, for example:
    docker run --user $(id -u):$(id -g) ...
    This runs the container processes using the student's UID and GID.
