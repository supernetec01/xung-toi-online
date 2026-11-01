-- Keep the choir portal approach outside the expanded last pew footprint.
UPDATE catalog_current SET version=version+1,payload=jsonb_set(payload,'{scenes,nave,anchors,choir}','[12,77]'::jsonb);
INSERT INTO catalog_publications(version,payload,reason) SELECT version,payload,'V9 accessible choir portal approach' FROM catalog_current;
