-- Mevcut her kullanıcı için "2026 Spring" adlı aktif bir Term oluştur
-- ve o kullanıcıya ait termId=null olan dersleri bu terme bağla.

INSERT INTO "Term" ("userId", "name", "isActive", "startedAt")
SELECT DISTINCT u.id, '2026 Spring', true, NOW()
FROM "User" u;

-- Her dersi, kendi kullanıcısına ait yeni terme bağla
UPDATE "Lesson" l
SET "termId" = t.id
FROM "Term" t
WHERE t."userId" = l."userId"
  AND l."termId" IS NULL;
