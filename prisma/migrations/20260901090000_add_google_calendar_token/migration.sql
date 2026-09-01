-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "googleCalendarRefreshToken" TEXT;
ALTER TABLE "Employee" ADD COLUMN "googleCalendarConnectedAt" TIMESTAMP(3);
