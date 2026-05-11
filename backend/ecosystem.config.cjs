module.exports = {
  apps: [
    {
      name: "unisage-api",
      cwd: "/var/www/unisage/backend",
      script: "src/app.js",
      exec_mode: "cluster",
      instances: "max",
      node_args: "--max-old-space-size=512",
      max_memory_restart: "650M",
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,
      out_file: "/var/log/unisage-api/out.log",
      error_file: "/var/log/unisage-api/error.log",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
