module.exports = {
  apps: [{
    name: "vexatrade-backend",
    script: "server.js",
    instances: "max",
    exec_mode: "cluster",
    env: { NODE_ENV: "production" },
    max_memory_restart: "512M",
    time: true
  }]
};
