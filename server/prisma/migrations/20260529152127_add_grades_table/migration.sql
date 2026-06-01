/*
  Warnings:

  - The `invNo` column on the `Stock` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `invNo` column on the `StockMaster` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "invNo",
ADD COLUMN     "invNo" INTEGER;

-- AlterTable
ALTER TABLE "StockMaster" DROP COLUMN "invNo",
ADD COLUMN     "invNo" INTEGER;

-- CreateTable
CREATE TABLE "Grade" (
    "grade" TEXT NOT NULL,
    "tea_type" INTEGER NOT NULL,
    "tare_wt" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("grade")
);
