-- Previous document records contained metadata only and have no binary in OCI.
DELETE FROM "Document"
WHERE "sizeBytes" = 0
  AND "checksumSha256" = '';
