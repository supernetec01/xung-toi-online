// New online modules require explicit opt-in when starting a production deployment.
const enabled = (name) =>
  process.env[name] === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env[name] !== 'false');
module.exports = {
  get admin() {
    return enabled('FEATURE_ADMIN');
  },
  get chat() {
    return enabled('FEATURE_CHAT');
  },
  get ambient() {
    return enabled('FEATURE_AMBIENT_NPC');
  },
};
