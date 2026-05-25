jest.mock('../utils/time.util', () => ({
  getCurrentTime: jest.fn(() => new Date(2026, 4, 21, 10)),
}));

import { PlannerService } from './planner.service';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    lesson: {
      update: jest.fn(),
    },
    checklistItem: {
      findMany: jest.fn(),
    },
    scheduledBlock: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

function createUser() {
  return {
    busySlots: [],
    lessons: [],
    weeklyFeedbacks: [],
    checklists: [],
    preferredStudyTime: 'morning',
    studyStyle: 'normal',
  };
}

function createLesson(id: number) {
  return {
    id,
    name: `Lesson ${id}`,
    difficulty: 3,
    keyfiDelayCount: 0,
    zorunluDelayCount: 0,
    zorunluMissedBlocks: 0,
    needsMoreTime: 0,
    exams: [],
    deadlines: [],
  };
}

function createFullWeekBusySlots() {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    isRoutine: true,
    date: null,
    startTime: '08:00',
    endTime: '24:00',
    fatigueLevel: 1,
  }));
}

describe('PlannerService', () => {
  it('creates a full weekly plan even during the first week', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      ...createUser(),
      currentTermStartedAt: new Date(2026, 4, 21),
    });
    prisma.scheduledBlock.findMany.mockResolvedValue([]);

    const service = new PlannerService(prisma as any);
    await service.createWeeklyPlan(1, new Date(2026, 4, 21, 10));

    expect(prisma.scheduledBlock.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        weekStart: new Date(2026, 4, 18),
      },
    });
  });

  it('recalculates only today and future blocks', async () => {
    const prisma = createPrismaMock();
    prisma.scheduledBlock.findMany
      .mockResolvedValueOnce([{ lessonId: 7, blockCount: 3 }])
      .mockResolvedValueOnce([]);
    prisma.checklistItem.findMany.mockResolvedValue([
      { lessonId: 7, completedBlocks: 1 },
    ]);
    prisma.user.findUnique.mockResolvedValue(createUser());

    const service = new PlannerService(prisma as any);
    await service.recalculate(1);

    const deleteArg = prisma.scheduledBlock.deleteMany.mock.calls[0][0];
    expect(deleteArg.where.userId).toBe(1);
    expect(deleteArg.where.date.gte).toBeInstanceOf(Date);
    expect(deleteArg.where.date.gte.getHours()).toBe(0);
    expect(deleteArg.where.date.gte.getMinutes()).toBe(0);
  });

  it('recalculates from max(today, fromDate) and subtracts completed previous checklist blocks', async () => {
    const prisma = createPrismaMock();
    prisma.scheduledBlock.findMany
      .mockResolvedValueOnce([
        { lessonId: 7, blockCount: 3 },
        { lessonId: 8, blockCount: 2 },
      ])
      .mockResolvedValueOnce([]);
    prisma.checklistItem.findMany.mockResolvedValue([
      { lessonId: 7, completedBlocks: 1 },
      { lessonId: 8, completedBlocks: 2 },
    ]);
    prisma.user.findUnique.mockResolvedValue(createUser());

    const service = new PlannerService(prisma as any);
    await service.recalculate(1, '2026-05-22');

    expect(prisma.scheduledBlock.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 1,
        weekStart: new Date(2026, 4, 18),
        date: { gte: new Date(2026, 4, 22) },
      },
    });
    expect(prisma.checklistItem.findMany).toHaveBeenCalledWith({
      where: {
        checklist: {
          userId: 1,
          date: { gte: new Date(2026, 4, 18), lt: new Date(2026, 4, 22) },
        },
      },
    });

    const deleteArg = prisma.scheduledBlock.deleteMany.mock.calls[0][0];
    expect(deleteArg.where).toEqual({
      userId: 1,
      weekStart: new Date(2026, 4, 18),
      date: { gte: new Date(2026, 4, 22) },
    });
  });

  it('returns programLevel and does not call lesson.update when days are fully blocked', async () => {
    const prisma = createPrismaMock();
    prisma.scheduledBlock.findMany
      .mockResolvedValueOnce([{ lessonId: 7, blockCount: 3 }])
      .mockResolvedValueOnce([]);
    prisma.checklistItem.findMany.mockResolvedValue([
      { lessonId: 7, completedBlocks: 1 },
    ]);
    prisma.user.findUnique.mockResolvedValue({
      ...createUser(),
      busySlots: createFullWeekBusySlots(),
      lessons: [createLesson(7)],
    });

    const service = new PlannerService(prisma as any);
    const result = await service.recalculate(1);

    expect(result.programLevel).toBeDefined();
    expect(result.programScore).toBeDefined();
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });

  it('places lessons and returns programLevel when recalculated lessons fit', async () => {
    const prisma = createPrismaMock();
    prisma.scheduledBlock.findMany
      .mockResolvedValueOnce([{ lessonId: 7, blockCount: 2 }])
      .mockResolvedValueOnce([]);
    prisma.checklistItem.findMany.mockResolvedValue([
      { lessonId: 7, completedBlocks: 0 },
    ]);
    prisma.user.findUnique.mockResolvedValue({
      ...createUser(),
      lessons: [createLesson(7)],
    });

    const service = new PlannerService(prisma as any);
    const result = await service.recalculate(1);

    expect(result.programLevel).toBeDefined();
    expect(prisma.scheduledBlock.create).toHaveBeenCalled();
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });
});
