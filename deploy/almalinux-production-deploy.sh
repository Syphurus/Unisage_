#!/usr/bin/env bash
set -Eeuo pipefail

# UniSage production deployment for AlmaLinux/RHEL-family VPS hosts.
# Run from the repository root on the VPS:
#   sudo bash deploy/almalinux-production-deploy.sh
#
# Optional environment:
#   DOMAIN=api.example.com CERTBOT_EMAIL=admin@example.com BACKEND_PORT=3000 PRODUCTION_ENV_FILE=backend/.env.production sudo -E bash deploy/almalinux-production-deploy.sh

APP_NAME="${APP_NAME:-unisage-api}"
REPO_ROOT="${REPO_ROOT:-$(pwd)}"
BACKEND_DIR="${BACKEND_DIR:-}"
BACKEND_PORT="${BACKEND_PORT:-}"
PRODUCTION_ENV_FILE="${PRODUCTION_ENV_FILE:-}"
DOMAIN="${DOMAIN:-_}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
NGINX_CONF="/etc/nginx/nginx.conf"
NGINX_APP_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"
LOG_DIR="/var/log/${APP_NAME}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must run as root. Exact command: sudo -E bash deploy/almalinux-production-deploy.sh"
  exit 1
fi

step_no=0
run() {
  echo
  echo "COMMAND: $*"
  "$@"
}

step() {
  step_no=$((step_no + 1))
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "STEP ${step_no}: $1"
  echo "WHY: $2"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

verify() {
  echo
  echo "VERIFY: $*"
  "$@"
}

require_file() {
  [[ -f "$1" ]] || {
    echo "Required file missing: $1"
    exit 1
  }
}

detect_backend_dir() {
  if [[ -n "${BACKEND_DIR}" ]]; then
    echo "${BACKEND_DIR}"
    return
  fi
  if [[ -f "${REPO_ROOT}/backend/package.json" ]]; then
    echo "${REPO_ROOT}/backend"
    return
  fi
  if [[ -f "${REPO_ROOT}/package.json" ]]; then
    echo "${REPO_ROOT}"
    return
  fi
  find "${REPO_ROOT}" -maxdepth 3 -name package.json -not -path "*/node_modules/*" -print -quit | xargs dirname
}

detect_start_script() {
  if grep -q '"start"[[:space:]]*:' "${BACKEND_DIR}/package.json"; then
    echo "npm start"
  elif grep -q '"main"[[:space:]]*:' "${BACKEND_DIR}/package.json"; then
    sed -n 's/.*"main"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/node \1/p' "${BACKEND_DIR}/package.json" | head -1
  else
    echo "node src/app.js"
  fi
}

detect_port() {
  if [[ -n "${BACKEND_PORT}" ]]; then
    echo "${BACKEND_PORT}"
    return
  fi
  if [[ -f "${BACKEND_DIR}/.env" ]] && grep -Eq '^PORT=[0-9]+' "${BACKEND_DIR}/.env"; then
    grep -E '^PORT=[0-9]+' "${BACKEND_DIR}/.env" | tail -1 | cut -d= -f2
    return
  fi
  if [[ -f "${BACKEND_DIR}/ecosystem.config.cjs" ]] && grep -Eq 'PORT:[[:space:]]*[0-9]+' "${BACKEND_DIR}/ecosystem.config.cjs"; then
    grep -Eo 'PORT:[[:space:]]*[0-9]+' "${BACKEND_DIR}/ecosystem.config.cjs" | tail -1 | grep -Eo '[0-9]+'
    return
  fi
  grep -R "process.env.PORT" -n "${BACKEND_DIR}" >/dev/null 2>&1 && echo "3000" || echo "3000"
}

detect_production_env_file() {
  if [[ -n "${PRODUCTION_ENV_FILE}" ]]; then
    echo "${PRODUCTION_ENV_FILE}"
    return
  fi
  if [[ -f "/tmp/unisage.env" ]]; then
    echo "/tmp/unisage.env"
    return
  fi
  if [[ -f "${BACKEND_DIR}/.env.production" ]]; then
    echo "${BACKEND_DIR}/.env.production"
    return
  fi
  if [[ -f "${REPO_ROOT}/deploy/production.env" ]]; then
    echo "${REPO_ROOT}/deploy/production.env"
    return
  fi
  echo ""
}

BACKEND_DIR="$(detect_backend_dir)"
require_file "${BACKEND_DIR}/package.json"
START_COMMAND="$(detect_start_script)"
BACKEND_PORT="$(detect_port)"

step "Verify current working directory and framework" "Deployment choices depend on the real repository path, package metadata, app entrypoint, and backend port."
echo "COMMAND: pwd"
pwd
echo "COMMAND: cat /etc/os-release"
sed -n '1,12p' /etc/os-release
echo "COMMAND: node -e framework detection"
node -e 'const p=require(process.argv[1]); const d={...p.dependencies,...p.devDependencies}; console.log(d.express ? "Detected backend framework: Express" : d.fastify ? "Detected backend framework: Fastify" : d["@nestjs/core"] ? "Detected backend framework: NestJS" : "Detected backend framework: Node.js"); console.log("Start command:", process.argv[2]);' "${BACKEND_DIR}/package.json" "${START_COMMAND}" 2>/dev/null || true
echo "Repository root: ${REPO_ROOT}"
echo "Backend directory: ${BACKEND_DIR}"
echo "Backend port: ${BACKEND_PORT}"
verify test -f "${BACKEND_DIR}/package.json"

step "Install AlmaLinux production packages" "Node.js, Nginx, Certbot, firewalling, fail2ban, and diagnostics are required for a managed production API host."
run dnf -y install dnf-plugins-core
run dnf -y install epel-release || true
run dnf config-manager --set-enabled crb || true
run dnf -y module reset nodejs || true
run dnf -y module enable nodejs:20 || true
if ! dnf -y install nodejs npm nginx git curl wget unzip certbot python3-certbot-nginx firewalld fail2ban htop logrotate; then
  echo "Node.js 20 AppStream install failed; using NodeSource RPM setup for Node.js 20."
  run dnf -y install curl ca-certificates
  echo "COMMAND: curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  run dnf -y install nodejs nginx git curl wget unzip certbot python3-certbot-nginx firewalld fail2ban htop logrotate
fi
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" != "20" ]]; then
  echo "Installed Node.js is not 20.x; replacing it with NodeSource Node.js 20."
  run dnf -y remove nodejs nodejs-npm nodejs-libs nodejs-docs nodejs-full-i18n || true
  run dnf -y install curl ca-certificates
  echo "COMMAND: curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  run dnf -y install nodejs
fi
verify node -v
verify npm -v
verify nginx -v
verify certbot --version

step "Configure firewalld" "Only SSH, HTTP, and HTTPS should be reachable publicly; the Node.js backend stays bound behind Nginx."
run systemctl enable --now firewalld
run firewall-cmd --permanent --add-service=ssh
run firewall-cmd --permanent --add-service=http
run firewall-cmd --permanent --add-service=https
run firewall-cmd --reload
verify firewall-cmd --list-all

step "Create production environment file" "The API validates secrets at boot, so production needs a locked-down .env with NODE_ENV and the detected backend port."
SOURCE_ENV_FILE="$(detect_production_env_file)"
if [[ -n "${SOURCE_ENV_FILE}" ]]; then
  require_file "${SOURCE_ENV_FILE}"
  run install -m 600 "${SOURCE_ENV_FILE}" "${BACKEND_DIR}/.env"
  [[ "${SOURCE_ENV_FILE}" == "/tmp/unisage.env" ]] && run rm -f /tmp/unisage.env
elif [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "ERROR: No production env file found."
  echo "Create backend/.env.production from deploy/production.env.example, fill real secrets, then run:"
  echo "  PRODUCTION_ENV_FILE=backend/.env.production sudo -E bash deploy/almalinux-production-deploy.sh"
  echo "Or upload it to the VPS first:"
  echo "  scp backend/.env.production user@host:/tmp/unisage.env"
  exit 2
fi
run cp "${BACKEND_DIR}/.env" "${BACKEND_DIR}/.env.$(date +%Y%m%d%H%M%S).bak"
grep -q '^NODE_ENV=' "${BACKEND_DIR}/.env" && sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "${BACKEND_DIR}/.env" || echo 'NODE_ENV=production' >> "${BACKEND_DIR}/.env"
grep -q '^PORT=' "${BACKEND_DIR}/.env" && sed -i "s/^PORT=.*/PORT=${BACKEND_PORT}/" "${BACKEND_DIR}/.env" || echo "PORT=${BACKEND_PORT}" >> "${BACKEND_DIR}/.env"
grep -q '^LOG_LEVEL=' "${BACKEND_DIR}/.env" && sed -i 's/^LOG_LEVEL=.*/LOG_LEVEL=info/' "${BACKEND_DIR}/.env" || echo 'LOG_LEVEL=info' >> "${BACKEND_DIR}/.env"
grep -q '^RATE_LIMIT_WINDOW_MS=' "${BACKEND_DIR}/.env" || echo 'RATE_LIMIT_WINDOW_MS=900000' >> "${BACKEND_DIR}/.env"
grep -q '^RATE_LIMIT_MAX=' "${BACKEND_DIR}/.env" || echo 'RATE_LIMIT_MAX=5000' >> "${BACKEND_DIR}/.env"
grep -q '^SLOW_REQUEST_MS=' "${BACKEND_DIR}/.env" || echo 'SLOW_REQUEST_MS=1500' >> "${BACKEND_DIR}/.env"
run chmod 600 "${BACKEND_DIR}/.env"
verify bash -c "test -s '${BACKEND_DIR}/.env' && stat -c '%a %n' '${BACKEND_DIR}/.env'"
if grep -Eq '<|your-|xxxxxxxx|rotate-after-any-leak' "${BACKEND_DIR}/.env"; then
  echo "ERROR: ${BACKEND_DIR}/.env still contains placeholder secrets. Production boot is intentionally blocked until real secrets are present."
  exit 2
fi

step "Install npm dependencies" "Locked production dependencies keep the server reproducible and omit development-only packages."
cd "${BACKEND_DIR}"
if [[ -f package-lock.json ]]; then
  run npm ci --omit=dev
else
  run npm install --omit=dev
fi
verify npm ls --omit=dev --depth=0

step "Install and configure PM2" "PM2 provides cluster mode, crash recovery, memory restarts, centralized logs, and reboot persistence."
run npm install -g pm2
run mkdir -p "${LOG_DIR}"
run chmod 755 "${LOG_DIR}"
cat > "${BACKEND_DIR}/ecosystem.production.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: "${APP_NAME}",
      cwd: "${BACKEND_DIR}",
      script: "src/app.js",
      exec_mode: "cluster",
      instances: "max",
      node_args: "--max-old-space-size=768 --optimize-for-size",
      max_memory_restart: "850M",
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 20,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 15000,
      listen_timeout: 15000,
      time: true,
      merge_logs: true,
      out_file: "${LOG_DIR}/out.log",
      error_file: "${LOG_DIR}/error.log",
      env: {
        NODE_ENV: "production",
        PORT: ${BACKEND_PORT},
        UV_THREADPOOL_SIZE: "16"
      }
    }
  ]
};
EOF
echo "COMMAND: pm2 startOrReload ${BACKEND_DIR}/ecosystem.production.config.js --env production"
pm2 startOrReload "${BACKEND_DIR}/ecosystem.production.config.js" --env production
run pm2 save
echo "COMMAND: pm2 startup systemd -u root --hp /root"
pm2 startup systemd -u root --hp /root
verify pm2 status

step "Configure Nginx reverse proxy" "Nginx handles public HTTP/S traffic, connection reuse, uploads, websockets, buffering, rate limiting, and security headers while proxying to localhost."
run cp "${NGINX_CONF}" "${NGINX_CONF}.$(date +%Y%m%d%H%M%S).bak"
cat > "${NGINX_CONF}" <<'EOF'
user nginx;
worker_processes auto;
worker_rlimit_nofile 200000;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 8192;
    multi_accept on;
    use epoll;
}

http {
    server_tokens off;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time"';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 10000;
    types_hash_max_size 4096;
    client_max_body_size 100m;
    client_body_timeout 60s;
    client_header_timeout 20s;
    reset_timedout_connection on;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;

    proxy_cache_path /var/cache/nginx/unisage levels=1:2 keys_zone=unisage_cache:50m max_size=512m inactive=30m use_temp_path=off;
    limit_req_zone $binary_remote_addr zone=api_limit:20m rate=20r/s;
    limit_conn_zone $binary_remote_addr zone=addr_conn:20m;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    map $http_user_agent $bad_bot {
        default 0;
        ~*(nikto|sqlmap|acunetix|masscan|zgrab|nmap|dirbuster|gobuster|wpscan) 1;
    }

    include /etc/nginx/conf.d/*.conf;
}
EOF

cat > "${NGINX_APP_CONF}" <<EOF
upstream ${APP_NAME}_upstream {
    server 127.0.0.1:${BACKEND_PORT};
    keepalive 128;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    if (\$bad_bot) { return 444; }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-XSS-Protection "0" always;

    limit_req zone=api_limit burst=80 nodelay;
    limit_conn addr_conn 80;

    location = /health {
        proxy_pass http://${APP_NAME}_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        access_log off;
    }

    location / {
        proxy_pass http://${APP_NAME}_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 15s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
        send_timeout 180s;

        proxy_buffering on;
        proxy_buffer_size 32k;
        proxy_buffers 16 64k;
        proxy_busy_buffers_size 128k;
        proxy_temp_file_write_size 256k;
        proxy_request_buffering on;

        proxy_cache_bypass \$http_authorization \$http_upgrade;
        proxy_no_cache \$http_authorization \$http_upgrade;
        add_header Cache-Control "no-store" always;
    }

    # SSL placeholder:
    # Run this when DNS points to the VPS:
    # certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL:-admin@example.com} --redirect
}
EOF
run nginx -t
run systemctl enable --now nginx
run systemctl reload nginx
verify systemctl --no-pager --full status nginx

step "Configure fail2ban" "Repeated malicious requests and SSH failures should be banned automatically before they consume API capacity."
cat > /etc/fail2ban/jail.d/unisage.conf <<'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = %(sshd_log)s
maxretry = 5
findtime = 10m
bantime = 1h

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 10m
bantime = 1h

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 10m
bantime = 1h
EOF
run systemctl enable --now fail2ban
run systemctl restart fail2ban
verify fail2ban-client status

step "Configure log rotation" "Long-running APIs must keep logs useful without filling the disk."
cat > "/etc/logrotate.d/${APP_NAME}" <<EOF
${LOG_DIR}/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}

${BACKEND_DIR}/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
verify logrotate -d "/etc/logrotate.d/${APP_NAME}"

step "Optimize Linux kernel and limits" "High concurrency Node.js APIs need larger socket queues, ephemeral port range, file limits, and safer TCP defaults."
cat > /etc/sysctl.d/99-unisage-api.conf <<'EOF'
fs.file-max = 1000000
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 16384
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_syncookies = 1
vm.swappiness = 10
EOF
cat > /etc/security/limits.d/99-unisage-api.conf <<'EOF'
root soft nofile 200000
root hard nofile 200000
nginx soft nofile 200000
nginx hard nofile 200000
* soft nofile 200000
* hard nofile 200000
EOF
mkdir -p /etc/systemd/system/nginx.service.d
cat > /etc/systemd/system/nginx.service.d/limits.conf <<'EOF'
[Service]
LimitNOFILE=200000
EOF
run sysctl --system
run systemctl daemon-reload
run systemctl restart nginx
verify bash -c 'ulimit -n'
verify sysctl net.core.somaxconn fs.file-max

step "Verify backend, PM2, Nginx, firewall, and reverse proxy" "Final checks prove crash-managed Node.js and public reverse proxy routing are both working."
sleep 3
verify pm2 status
verify curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health"
verify curl -fsS "http://127.0.0.1/health"
verify systemctl is-active nginx
verify systemctl is-active firewalld
verify firewall-cmd --list-ports
verify ss -tulpn

if [[ "${DOMAIN}" != "_" && -n "${CERTBOT_EMAIL}" ]]; then
  step "Issue HTTPS certificate" "A real domain with DNS pointed to this VPS can receive a trusted Let's Encrypt certificate and redirect HTTP to HTTPS."
  echo "COMMAND: certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL} --redirect"
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect || {
    echo "Certbot failed. DNS may not point at this VPS yet. Nginx remains SSL-ready with the HTTP reverse proxy active."
  }
  nginx -t && systemctl reload nginx
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend directory: ${BACKEND_DIR}"
echo "Backend local URL: http://127.0.0.1:${BACKEND_PORT}/health"
echo "Public URL: http://${DOMAIN}/health"
echo "PM2 config: ${BACKEND_DIR}/ecosystem.production.config.js"
echo "Nginx config: ${NGINX_CONF}"
echo "Nginx app config: ${NGINX_APP_CONF}"
echo "Sysctl config: /etc/sysctl.d/99-unisage-api.conf"
echo "Limits config: /etc/security/limits.d/99-unisage-api.conf"
echo "Fail2ban config: /etc/fail2ban/jail.d/unisage.conf"
echo "Logrotate config: /etc/logrotate.d/${APP_NAME}"
echo
pm2 status
systemctl --no-pager --full status nginx || true
firewall-cmd --list-all || true
