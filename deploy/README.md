# UniSage Hostinger Backend Deployment

## AlmaLinux 10 VPS deployment

For the current Hostinger VPS target, use the AlmaLinux/RHEL-compatible script:

```bash
sudo -E bash deploy/almalinux-production-deploy.sh
```

Optional HTTPS/domain run:

```bash
DOMAIN="api.your-domain.com" \
CERTBOT_EMAIL="you@example.com" \
BACKEND_PORT="3000" \
PRODUCTION_ENV_FILE="backend/.env.production" \
sudo -E bash deploy/almalinux-production-deploy.sh
```

The script installs Node.js 20, npm, Nginx, Git, curl, wget, unzip, Certbot,
firewalld, fail2ban, htop, PM2, production dependencies, PM2 cluster mode,
Nginx reverse proxy hardening, log rotation, system limits, kernel networking
tuning, and final health checks. It prints the reason, exact command, and
verification output for every major step.

Important: the backend requires real production secrets. The script installs a
production env file as `backend/.env`, secures it with mode `0600`, normalizes
`NODE_ENV`, `PORT`, and logging/rate-limit defaults, then intentionally stops if
it detects placeholder secrets.

On the VPS, create or upload the env file before running the AlmaLinux script:

```bash
cp deploy/production.env.example backend/.env.production
chmod 600 backend/.env.production
```

Fill every secret in `backend/.env.production`, then run the script with
`PRODUCTION_ENV_FILE=backend/.env.production`. If you are deploying from your
local machine, upload it first:

```bash
scp -i ./unisage.pem backend/.env.production root@YOUR_VPS_IP:/tmp/unisage.env
```

The AlmaLinux script automatically consumes `/tmp/unisage.env` and writes it to
the backend as `backend/.env`.

## Legacy Ubuntu deployment

This deployment targets Ubuntu 22.04, Node.js 20, PM2 cluster mode, Nginx,
Certbot, UFW, fail2ban, and the UniSage backend on port 3000.

## Prerequisites

Point `api.your-domain.com` to the VPS public IP before running Certbot.
Commit and push these deployment files before running the script, because the VPS
deploys from GitHub.

Create a production env file locally:

```bash
cp deploy/production.env.example backend/.env.production
chmod 600 backend/.env.production
```

Fill every secret in `backend/.env.production`.

## One-command deploy

```bash
VPS_HOST="YOUR_VPS_IP" \
VPS_USER="root" \
SSH_KEY="./unisage.pem" \
DOMAIN="api.your-domain.com" \
CERTBOT_EMAIL="you@example.com" \
REPO_URL="https://github.com/Syphurus/Unisage_.git" \
BRANCH="deploy-exam-priority-predictor-payments" \
LOCAL_ENV_FILE="backend/.env.production" \
./deploy/hostinger-deploy.sh
```

`LOCAL_ENV_FILE` defaults to `backend/.env.production`; the script uploads it to
the VPS and writes it securely to `/var/www/unisage/backend/.env`.

## What the script does

1. SSH connection
   - Why: confirms key access and sudo before changing the server.
   - Command: `ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" "sudo true"`
   - Expected: no output and exit code 0.
   - Verify: script continues.
   - Troubleshoot: fix VPS IP, username, key permissions, or Hostinger firewall.

2. Ubuntu packages
   - Why: installs security updates and required services.
   - Command: `sudo apt-get update && sudo apt-get upgrade -y`
   - Expected: package lists update and upgrades complete.
   - Verify: `apt list --upgradable`.
   - Troubleshoot: rerun after fixing DNS or apt lock issues.

3. Runtime packages
   - Why: installs Node.js, npm, git, Nginx, Certbot, UFW, curl, and fail2ban.
   - Command: handled inside `deploy/hostinger-deploy.sh`.
   - Expected: `node -v`, `npm -v`, `nginx -v`, and `certbot --version` work.
   - Verify: script checks runtime commands and later tests Nginx.
   - Troubleshoot: inspect `/var/log/apt/term.log`.

4. Repository and dependencies
   - Why: gets the production code and installs locked dependencies.
   - Command: `git clone` or `git pull`, then `npm ci --omit=dev`.
   - Expected: repo at `/var/www/unisage`, backend deps installed.
   - Verify: `ls /var/www/unisage/backend/package.json`.
   - Troubleshoot: confirm branch name and repo access.

5. Production environment
   - Why: supplies required Supabase, JWT, CORS, UPI, and Razorpay settings.
   - Command: uploads `LOCAL_ENV_FILE` to `/var/www/unisage/backend/.env`.
   - Expected: mode `0600`.
   - Verify: `sudo ls -l /var/www/unisage/backend/.env`.
   - Troubleshoot: compare with `deploy/production.env.example`.

6. PM2
   - Why: runs the API in cluster mode with auto-restart, memory limits, startup persistence, and logs.
   - Command: `pm2 startOrReload backend/ecosystem.config.cjs --env production && pm2 save`.
   - Expected: `unisage-api` online.
   - Verify: `pm2 status` and `pm2 logs unisage-api`.
   - Troubleshoot: `pm2 logs unisage-api --lines 100`.

7. Nginx
   - Why: terminates HTTPS and proxies public traffic to `127.0.0.1:3000`.
   - Command: renders `/etc/nginx/nginx.conf` and `/etc/nginx/sites-available/unisage-api`.
   - Expected: `nginx -t` succeeds.
   - Verify: `sudo systemctl status nginx`.
   - Troubleshoot: `sudo journalctl -u nginx -n 100 --no-pager`.

8. SSL
   - Why: installs a trusted Let's Encrypt certificate.
   - Command: `sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect`.
   - Expected: certificate issued and HTTPS redirect active.
   - Verify: `curl -I https://$DOMAIN/health`.
   - Troubleshoot: confirm DNS A record points to this VPS and port 80 is open.

9. Firewall and fail2ban
   - Why: allows only SSH, HTTP, HTTPS and bans repeated abusive traffic.
   - Command: `ufw allow 22/tcp`, `ufw allow 80/tcp`, `ufw allow 443/tcp`, fail2ban jail config.
   - Expected: UFW active; fail2ban enabled.
   - Verify: `sudo ufw status verbose` and `sudo fail2ban-client status`.
   - Troubleshoot: keep the current SSH session open while fixing UFW rules.

10. Final verification
    - Why: proves the deployment is live through Node, PM2, Nginx, and HTTPS.
    - Command: `curl http://127.0.0.1:3000/health` and `curl https://$DOMAIN/health`.
    - Expected: JSON with `status: "ok"`.
    - Verify: script prints `Deployment complete: https://$DOMAIN/health`.
    - Troubleshoot: check PM2 logs, Nginx error log, DNS, and `.env` values.
