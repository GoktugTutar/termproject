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
const lesson_entity_js_1 = require("./lesson.entity.js");
let LessonService = class LessonService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async registerMany(userId, dtos) {
        const entities = dtos.map((dto) => {
            const entity = this.repo.create();
            entity.userId = userId;
            entity.name = dto.name;
            entity.credit = dto.credit;
            entity.difficulty = dto.difficulty;
            entity.vizeDate = dto.vizeDate ? new Date(dto.vizeDate) : null;
            entity.finalDate = dto.finalDate ? new Date(dto.finalDate) : null;
            entity.homeworkDeadlines = dto.homeworkDeadlines ?? [];
            entity.semester = dto.semester;
            entity.delayCount = 0;
            return entity;
        });
        return this.repo.save(entities);
    }
    async update(userId, lessonName, dto) {
        const lesson = await this.repo.findOne({ where: { userId, name: lessonName } });
        if (!lesson)
            throw new common_1.NotFoundException(`Lesson "${lessonName}" not found`);
        if (dto.vizeDate)
            lesson.vizeDate = new Date(dto.vizeDate);
        if (dto.finalDate)
            lesson.finalDate = new Date(dto.finalDate);
        const { vizeDate, finalDate, ...rest } = dto;
        Object.assign(lesson, rest);
        return this.repo.save(lesson);
    }
    async findByUserId(userId) {
        return this.repo.find({ where: { userId } });
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async incrementDelay(lessonId) {
        await this.repo.increment({ id: lessonId }, 'delayCount', 1);
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lesson_entity_js_1.LessonEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LessonService);
//# sourceMappingURL=lesson.service.js.map