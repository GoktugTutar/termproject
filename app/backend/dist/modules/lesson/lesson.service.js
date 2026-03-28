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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lesson_entity_1 = require("./lesson.entity");
let LessonService = class LessonService {
    lessonRepo;
    constructor(lessonRepo) {
        this.lessonRepo = lessonRepo;
    }
    async findAllByUser(userId) {
        return this.lessonRepo.find({ where: { userId } });
    }
    async findById(id) {
        return this.lessonRepo.findOne({ where: { id } });
    }
    async findByName(userId, lessonName) {
        return this.lessonRepo.findOne({ where: { userId, lessonName } });
    }
    async bulkCreate(userId, dtos) {
        const entities = dtos.map((dto) => this.lessonRepo.create({
            userId,
            lessonName: dto.lessonName,
            difficulty: dto.difficulty,
            deadlines: dto.deadlines,
            semester: dto.semester,
            delay: 0,
        }));
        return this.lessonRepo.save(entities);
    }
    async update(userId, dto) {
        const lesson = await this.lessonRepo.findOne({
            where: { userId, lessonName: dto.lessonName },
        });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (dto.newLessonName)
            lesson.lessonName = dto.newLessonName;
        if (dto.difficulty !== undefined)
            lesson.difficulty = dto.difficulty;
        if (dto.deadlines !== undefined)
            lesson.deadlines = dto.deadlines;
        if (dto.semester !== undefined)
            lesson.semester = dto.semester;
        return this.lessonRepo.save(lesson);
    }
    async applyChecklistResult(id, userId, plannedHours, actualHours) {
        const lesson = await this.lessonRepo.findOne({ where: { id, userId } });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (actualHours !== null) {
            const R = plannedHours - actualHours;
            if (R !== 0)
                lesson.delay += 1;
        }
        else {
            lesson.delay += 1;
        }
        await this.lessonRepo.save(lesson);
    }
    async remove(id, userId) {
        const lesson = await this.lessonRepo.findOne({ where: { id, userId } });
        if (!lesson)
            throw new common_1.NotFoundException('Ders bulunamadı');
        await this.lessonRepo.remove(lesson);
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lesson_entity_1.LessonEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LessonService);
//# sourceMappingURL=lesson.service.js.map