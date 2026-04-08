import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg(new Pool({ connectionString }));
const prisma = new PrismaClient({ adapter });

function asDate(dateString: string) {
  return new Date(dateString);
}

function asTime(timeString: string) {
  return new Date(`1970-01-01T${timeString}:00.000Z`);
}

async function main() {
  await prisma.checklistItem.deleteMany();
  await prisma.dailyChecklist.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.weeklyFeedback.deleteMany();
  await prisma.weeklySchedule.deleteMany();
  await prisma.lessonExam.deleteMany();
  await prisma.userBusySlot.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "ayse@example.com",
      password: "hashed_password_example",
      name: "Ayşe Yılmaz",
      semester: 4,
      gpa: 3.42,
    },
  });

  await prisma.userBusySlot.createMany({
    data: [
      {
        userId: user.id,
        dayOfWeek: "monday",
        startTime: asTime("09:00"),
        endTime: asTime("12:00"),
        reason: "ders",
      },
      {
        userId: user.id,
        dayOfWeek: "wednesday",
        startTime: asTime("13:00"),
        endTime: asTime("15:00"),
        reason: "kulüp",
      },
      {
        userId: user.id,
        dayOfWeek: "friday",
        startTime: asTime("10:00"),
        endTime: asTime("12:00"),
        reason: "iş",
      },
    ],
  });

  const algorithms = await prisma.lesson.create({
    data: {
      userId: user.id,
      name: "Algorithms",
      credit: 4,
      difficulty: 5,
      semester: 4,
      remainingTopicsCount: 8,
      delayCount: 1,
    },
  });

  const database = await prisma.lesson.create({
    data: {
      userId: user.id,
      name: "Database Systems",
      credit: 3,
      difficulty: 4,
      semester: 4,
      remainingTopicsCount: 5,
      delayCount: 0,
    },
  });

  const operatingSystems = await prisma.lesson.create({
    data: {
      userId: user.id,
      name: "Operating Systems",
      credit: 4,
      difficulty: 5,
      semester: 4,
      remainingTopicsCount: 6,
      delayCount: 2,
    },
  });

  await prisma.lessonExam.createMany({
    data: [
      {
        lessonId: algorithms.id,
        examType: "midterm",
        examDate: new Date("2026-04-20T10:00:00Z"),
        weightPercentage: 30,
      },
      {
        lessonId: database.id,
        examType: "quiz",
        examDate: new Date("2026-04-18T12:00:00Z"),
        weightPercentage: 10,
      },
      {
        lessonId: operatingSystems.id,
        examType: "final",
        examDate: new Date("2026-06-10T09:00:00Z"),
        weightPercentage: 45,
      },
    ],
  });

  const weeklySchedule = await prisma.weeklySchedule.create({
    data: {
      userId: user.id,
      weekStartDate: asDate("2026-04-06"),
      weekEndDate: asDate("2026-04-12"),
      totalAvailableHours: 24,
      totalPlannedHours: 14,
      version: 1,
      status: "active",
    },
  });

  const block1 = await prisma.scheduleBlock.create({
    data: {
      weeklyScheduleId: weeklySchedule.id,
      lessonId: algorithms.id,
      blockDate: asDate("2026-04-06"),
      startTime: asTime("14:00"),
      endTime: asTime("16:00"),
      plannedHours: 2,
    },
  });

  const block2 = await prisma.scheduleBlock.create({
    data: {
      weeklyScheduleId: weeklySchedule.id,
      lessonId: database.id,
      blockDate: asDate("2026-04-07"),
      startTime: asTime("10:00"),
      endTime: asTime("12:00"),
      plannedHours: 2,
    },
  });

  const block3 = await prisma.scheduleBlock.create({
    data: {
      weeklyScheduleId: weeklySchedule.id,
      lessonId: operatingSystems.id,
      blockDate: asDate("2026-04-08"),
      startTime: asTime("16:00"),
      endTime: asTime("19:00"),
      plannedHours: 3,
    },
  });

  const dailyChecklist = await prisma.dailyChecklist.create({
    data: {
      userId: user.id,
      checklistDate: asDate("2026-04-08"),
      submitted: true,
      overallFocusScore: 4,
      overallEnergyScore: 3.5,
      todaySleeped: 7,
      stressLevel: 3,
      notes: "Algorithms konusu beklediğimden uzun sürdü.",
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        dailyChecklistId: dailyChecklist.id,
        lessonId: algorithms.id,
        scheduleBlockId: block1.id,
        allocatedHours: 2,
        completedHours: 1,
        wasCompleted: false,
        difficultyFeedback: 5,
        focusFeedback: 3,
        taskFeltLong: true,
        postponementReason: "konu uzadı",
      },
      {
        dailyChecklistId: dailyChecklist.id,
        lessonId: database.id,
        scheduleBlockId: block2.id,
        allocatedHours: 2,
        completedHours: 2,
        wasCompleted: true,
        difficultyFeedback: 3,
        focusFeedback: 4,
        taskFeltLong: false,
      },
      {
        dailyChecklistId: dailyChecklist.id,
        lessonId: operatingSystems.id,
        scheduleBlockId: block3.id,
        allocatedHours: 3,
        completedHours: 2,
        wasCompleted: false,
        difficultyFeedback: 4,
        focusFeedback: 4,
        taskFeltLong: false,
        postponementReason: "yorgunluk",
      },
    ],
  });

  await prisma.weeklyFeedback.create({
    data: {
      userId: user.id,
      weekStartDate: asDate("2026-04-06"),
      weekEndDate: asDate("2026-04-12"),
      workloadFeeling: "ideal",
      productivityScore: 4,
      sleepQualityScore: 3.5,
      mostDifficultLessonId: algorithms.id,
      feedbackText: "Genel olarak iyi bir haftaydı ama Algorithms daha fazla zaman istedi.",
    },
  });

  console.log("Seed başarıyla tamamlandı.");
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });