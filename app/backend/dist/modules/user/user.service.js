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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_js_1 = require("./user.entity.js");
const lesson_entity_js_1 = require("../lesson/lesson.entity.js");
const checklist_entity_js_1 = require("../checklist/checklist.entity.js");
const schedule_entity_js_1 = require("../planner/schedule.entity.js");
let UserService = class UserService {
    repo;
    lessonRepo;
    checklistRepo;
    scheduleRepo;
    constructor(repo, lessonRepo, checklistRepo, scheduleRepo) {
        this.repo = repo;
        this.lessonRepo = lessonRepo;
        this.checklistRepo = checklistRepo;
        this.scheduleRepo = scheduleRepo;
    }
    async create(data) {
        const user = this.repo.create(data);
        return this.repo.save(user);
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
    async updateProfile(id, dto) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        Object.assign(user, dto);
        return this.repo.save(user);
    }
    async delete(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.lessonRepo.delete({ userId: id });
        await this.checklistRepo.delete({ userId: id });
        await this.scheduleRepo.delete({ userId: id });
        await this.repo.remove(user);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_js_1.UserEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(lesson_entity_js_1.LessonEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(checklist_entity_js_1.ChecklistEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(schedule_entity_js_1.ScheduleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map