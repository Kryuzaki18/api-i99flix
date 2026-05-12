module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/server.js",
      instances: 1,                    // single instance on Render
      exec_mode: "fork",               // fork, not cluster
      node_args: "--max-old-space-size=256",  // cap heap explicitly
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      watch: false,
      max_memory_restart: "400M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};