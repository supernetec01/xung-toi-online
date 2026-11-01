const fs = require('node:fs'),
  { execFileSync } = require('node:child_process');
// The managed cloud daemon is local. Personal machines use their configured Docker context.
function dockerOptions(
  env = process.env,
  managed = process.platform === 'linux' && fs.existsSync('/etc/codex/network-policy.json'),
) {
  const environment = { ...env },
    prefix = [];
  if (managed) {
    for (const key of [
      'DOCKER_HOST',
      'DOCKER_CONTEXT',
      'DOCKER_TLS',
      'DOCKER_TLS_VERIFY',
      'DOCKER_CERT_PATH',
    ])
      delete environment[key];
    prefix.push('--host=unix:///var/run/docker.sock');
  }
  return { env: environment, prefix };
}
function docker(args, options = {}) {
  const config = dockerOptions();
  return execFileSync('docker', [...config.prefix, ...args], {
    env: config.env,
    stdio: 'pipe',
    ...options,
  });
}
module.exports = { docker, dockerOptions };
