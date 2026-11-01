-- Preserve accepted quest definitions before later CMS publications can change steps.
-- Existing questRewards remain authoritative for previously frozen rewards.
UPDATE player_states s
SET state=jsonb_set(s.state,'{questSnapshots}',COALESCE((
  SELECT jsonb_object_agg(q->>'id',q)
  FROM catalog_current c, jsonb_array_elements(c.payload->'quests') q
  WHERE (s.state->'accepted') ? (q->>'id')
),'{}'::jsonb))
WHERE NOT (s.state ? 'questSnapshots');
