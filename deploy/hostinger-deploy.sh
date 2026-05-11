#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-unisage-api}"
APP_ROOT="${APP_ROOT:-/var/www/unisage}"
BACKEND_DIR="$APP_ROOT/backend"
BRANCH="${BRANCH:-$(git branch --show-current 2>/dev/null || echo main)}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
SSH_PORT="${SSH_PORT:-22}"
NODE_MAJOR="${NODE_MAJOR:-20}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-backend/.env.production}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_var VPS_HOST
require_var VPS_USER
require_var DOMAIN
require_var CERTBOT_EMAIL
require_var REPO_URL

if [[ ! -f "${SSH_KEY:-}" ]]; then
  echo "SSH_KEY must point to your private key file, for example: SSH_KEY=./unisage.pem" >&2
  exit 1
fi

if [[ ! -f "$LOCAL_ENV_FILE" ]]; then
  echo "LOCAL_ENV_FILE not found: $LOCAL_ENV_FILE" >&2
  echo "Create one from deploy/production.env.example before deploying." >&2
  exit 1
fi

SSH_OPTS=(-i "$SSH_KEY" -p "$SSH_PORT" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)
REMOTE="$VPS_USER@$VPS_HOST"

echo "Step 1: connecting to VPS and preparing Ubuntu packages."
ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo true"

echo "Step 2: uploading production environment file."
ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo mkdir -p '$APP_ROOT' && sudo chown -R '$VPS_USER':'$VPS_USER' '$APP_ROOT'"
scp -i "$SSH_KEY" -P "$SSH_PORT" -o IdentitiesOnly=yes "$LOCAL_ENV_FILE" "$REMOTE:/tmp/unisage.env"

echo "Step 3: running production deployment on the VPS."
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "APP_NAME='$APP_NAME' APP_ROOT='$APP_ROOT' BACKEND_DIR='$BACKEND_DIR' BRANCH='$BRANCH' BACKEND_PORT='$BACKEND_PORT' DOMAIN='$DOMAIN' CERTBOT_EMAIL='$CERTBOT_EMAIL' REPO_URL='$REPO_URL' NODE_MAJOR='$NODE_MAJOR' bash -s" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

echo "WHY: Refresh package indexes and apply security fixes before installing runtime software."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "WHY: Install curl, git, Nginx, Certbot, UFW, fail2ban, and log rotation support."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates gnupg git nginx certbot python3-certbot-nginx ufw fail2ban logrotate

echo "WHY: Install Node.js ${NODE_MAJOR} from NodeSource for a current production runtime."
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

echo "WHY: Install PM2 globally so the backend is supervised and restored after reboot."
if ! command -v pm2 >/dev/null; then
  sudo npm install -g pm2
fi

echo "WHY: Increase OS limits for high concurrency Node/Nginx workloads."
cat <<LIMITS | sudo tee /etc/security/limits.d/99-unisage.conf >/dev/null
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
LIMITS

cat <<SYSCTL | sudo tee /etc/sysctl.d/99-unisage.conf >/dev/null
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65000
SYSCTL
sudo sysctl --system >/dev/null

echo "WHY: Clone or update the backend repository on the VPS."
sudo mkdir -p "$APP_ROOT"
sudo chown -R "$USER":"$USER" "$APP_ROOT"
if [[ ! -d "$APP_ROOT/.git" ]]; then
  rm -rf "$APP_ROOT"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_ROOT"
else
  git -C "$APP_ROOT" fetch origin "$BRANCH"
  git -C "$APP_ROOT" checkout "$BRANCH"
  git -C "$APP_ROOT" pull --ff-only origin "$BRANCH"
fi

echo "WHY: Install backend dependencies from package-lock for repeatable production installs."
cd "$BACKEND_DIR"
npm ci --omit=dev

echo "WHY: Write production environment securely for the Node process."
sudo install -d -m 0750 -o "$USER" -g "$USER" "$BACKEND_DIR"
install -m 0600 /tmp/unisage.env "$BACKEND_DIR/.env"
rm -f /tmp/unisage.env

echo "WHY: Prepare PM2 log directory with permissions for the deploying user."
sudo install -d -m 0755 -o "$USER" -g "$USER" /var/log/unisage-api

echo "WHY: Configure Nginx worker, gzip, security, rate limit, and upstream settings."
cat <<NGINX_MAIN | sudo tee /etc/nginx/nginx.conf >/dev/null
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 8192;
    multi_accept on;
    use epoll;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    server_tokens off;
    types_hash_max_size 4096;
    server_names_hash_bucket_size 128;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    keepalive_timeout 65;
    keepalive_requests 10000;
    client_body_timeout 15s;
    client_header_timeout 15s;
    send_timeout 30s;
    client_max_body_size 25m;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/rss+xml image/svg+xml;

    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        '' close;
    }

    limit_req_zone \$binary_remote_addr zone=api_limit:20m rate=20r/s;
    limit_conn_zone \$binary_remote_addr zone=addr:20m;

    upstream unisage_backend {
        server 127.0.0.1:${BACKEND_PORT};
        keepalive 128;
    }

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
NGINX_MAIN

cat <<HTTP_SITE | sudo tee /etc/nginx/sites-available/unisage-api >/dev/null
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://unisage_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
HTTP_SITE

sudo ln -sfn /etc/nginx/sites-available/unisage-api /etc/nginx/sites-enabled/unisage-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx || sudo systemctl restart nginx

echo "WHY: Request a trusted TLS certificate from Let's Encrypt using the HTTP challenge."
sudo mkdir -p /var/www/html
sudo certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --keep-until-expiring

echo "WHY: Install final HTTPS reverse proxy config with hardening, gzip, buffering, websocket support, and rate limits."
cat <<SITE | sudo tee /etc/nginx/sites-available/unisage-api >/dev/null
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    limit_req zone=api_limit burst=80 nodelay;
    limit_conn addr 100;

    location = /health {
        proxy_pass http://unisage_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Cache-Control "no-store" always;
    }

    location / {
        proxy_pass http://unisage_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 32 16k;
        proxy_busy_buffers_size 64k;

        add_header Cache-Control "no-store" always;
    }
}
SITE

sudo nginx -t
sudo systemctl reload nginx

echo "WHY: Configure firewall to allow SSH, HTTP, and HTTPS only."
sudo ufw allow "${SSH_PORT}/tcp"
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "WHY: Configure fail2ban for SSH and noisy Nginx abuse patterns."
cat <<JAIL | sudo tee /etc/fail2ban/jail.d/unisage.conf >/dev/null
[sshd]
enabled = true
port = ${SSH_PORT}
maxretry = 5
findtime = 10m
bantime = 1h

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 10m
maxretry = 20
bantime = 1h
JAIL
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "WHY: Start the API in PM2 cluster mode with memory limits and crash restarts."
pm2 startOrReload "$BACKEND_DIR/ecosystem.config.cjs" --env production
pm2 save
sudo env PATH="$PATH:/usr/bin" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" | tail -n +1

echo "WHY: Configure PM2 log rotation to prevent disk exhaustion."
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

echo "WHY: Verify PM2, local health, Nginx, HTTPS, firewall, and fail2ban."
pm2 status
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health"
curl -fsS "https://${DOMAIN}/health"
sudo nginx -t
sudo ufw status verbose
sudo fail2ban-client status
systemctl is-enabled nginx
systemctl is-active nginx

echo "Deployment complete: https://${DOMAIN}/health"
REMOTE_SCRIPT
