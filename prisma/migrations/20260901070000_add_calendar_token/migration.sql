-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_calendarToken_key" ON "Employee"("calendarToken");
