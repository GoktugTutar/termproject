"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonService = class LessonService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        return this.prisma.lesson.findMany({
            where: { userId },
            include: { exams: true },
        });
    }
    async create(userId, dto) {
        return this.prisma.lesson.create({
            data: { ...dto, userId },
            include: { exams: true },
        });
    }
    async update(userId, lessonId, dto) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (lesson.userId !== userId)
            throw new common_1.ForbiddenException();
        return this.prisma.lesson.update({
            where: { id: lessonId },
            data: dto,
            include: { exams: true },
        });
    }
    async remove(userId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (lesson.userId !== userId)
            throw new common_1.ForbiddenException();
        return this.prisma.lesson.delete({ where: { id: lessonId } });
    }
    async addExam(userId, lessonId, examDate) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (lesson.userId !== userId)
            throw new common_1.ForbiddenException();
        return this.prisma.lessonExam.create({
            data: { lessonId, examDate: new Date(examDate) },
        });
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonService);
//# sourceMappingURL=lesson.service.js.map