module.exports = {
  apps: [{
    name: 'finance-tracker',
    script: 'npm',
    args: 'start',
    cwd: process.env.HOME + '/finance-tracker',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: process.env.HOME + '/finance-tracker/logs/err.log',
    out_file: process.env.HOME + '/finance-tracker/logs/out.log',
    log_file: process.env.HOME + '/finance-tracker/logs/combined.log',
    time: true,
    // Restart strategies
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Memory monitoring
    memory_limit: '500M',
    // Auto-update on file changes (disable in production)
    ignore_watch: ['node_modules', 'logs', 'data'],
    // Graceful shutdown
    kill_timeout: 5000
  }]
};
