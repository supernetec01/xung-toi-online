const { fail } = require('./security.cjs');
function guard({ actorId, targetId, currentRoles, nextRoles, superAdminCount }) {
  if (actorId === targetId) fail(403, 'NO_SELF_ROLE_CHANGE');
  if (
    currentRoles.includes('SUPER_ADMIN') &&
    !nextRoles.includes('SUPER_ADMIN') &&
    superAdminCount <= 1
  )
    fail(409, 'LAST_SUPER_ADMIN');
}
module.exports = { guard };
