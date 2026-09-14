ALTER TABLE "ManualProject" ADD COLUMN "code" TEXT;

WITH numbered_projects AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS sequence
  FROM "ManualProject"
)
UPDATE "ManualProject" AS project
SET "code" = 'PRO-' || LPAD(numbered_projects.sequence::TEXT, 4, '0')
FROM numbered_projects
WHERE project."id" = numbered_projects."id";

ALTER TABLE "ManualProject" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "ManualProject_code_key" ON "ManualProject"("code");
