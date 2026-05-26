-- CreateTable
CREATE TABLE "UserConstraint" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'user_manual',
    "expiresAt" TIMESTAMP(3),
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConstraint_userId_isActive_idx" ON "UserConstraint"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "UserConstraint" ADD CONSTRAINT "UserConstraint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
