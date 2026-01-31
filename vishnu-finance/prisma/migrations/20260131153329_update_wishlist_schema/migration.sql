-- AlterTable
ALTER TABLE "public"."wishlist_items" ADD COLUMN     "category" TEXT,
ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "targetDate" TIMESTAMP(3);
