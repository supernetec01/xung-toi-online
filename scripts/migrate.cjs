const { migrate, pool } = require('../server/db.cjs');
migrate()
  .then(() => console.log('Database migrations ready.'))
  .catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
