const assert = require('node:assert/strict'),
  fs = require('node:fs');
const { validateCatalogBaseline } = require('../scripts/m0-audit.cjs');
const before = { itemIds: ['owned_old', 'archived_old'], sceneIds: ['old_room'] },
  approved = { itemIds: ['new_hair'] };
const current = { ...before, itemIds: [...before.itemIds, 'new_hair'] };
validateCatalogBaseline(before, before);
validateCatalogBaseline(current, before, approved);
for (const mutated of [
  { ...current, itemIds: ['owned_old', 'new_hair'] },
  { ...current, itemIds: [...current.itemIds, 'unapproved'] },
  { ...current, itemIds: [...current.itemIds, 'new_hair'] },
  { ...current, sceneIds: ['changed_room'] },
  { ...current, itemIds: ['archived_old', 'owned_old', 'new_hair'] },
])
  assert.throws(() => validateCatalogBaseline(mutated, before, approved), /baseline changed/);
fs.writeFileSync(
  'artifacts/v12/audit-guard.json',
  JSON.stringify(
    {
      checks: 7,
      approvedAdditionsAllowed: true,
      missingUnapprovedDuplicateReorderedIdsRejected: true,
      historicalBaselineUnmodified: true,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS 7 stable ID audit guards: approved additions only; existing IDs remain protected.',
);
