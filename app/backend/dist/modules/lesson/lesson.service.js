"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const DATA_PATH = path.join(__dirname, '../../data/lessons.json');
let LessonService = class LessonService {
    read() {
        try {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        }
        catch {
            return [];
        }
    }
    write(lessons) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(lessons, null, 2));
    }
    findAllByUser(userId) {
        return this.read().filter((l) => l.userId === userId);
    }
    findById(id) {
        return this.read().find((l) => l.id === id);
    }
    findByName(userId, lessonName) {
        return this.read().find((l) => l.userId === userId && l.lessonName === lessonName);
    }
    bulkCreate(userId, dtos) {
        const lessons = this.read();
        const created = dtos.map((dto) => ({
            id: (0, uuid_1.v4)(),
            userId,
            lessonName: dto.lessonName,
            difficulty: dto.difficulty,
            deadlines: dto.deadlines,
            semester: dto.semester,
            delay: 0,
            createdAt: new Date().toISOString(),
        }));
        lessons.push(...created);
        this.write(lessons);
        return created;
    }
    update(userId, dto) {
        const lessons = this.read();
        const idx = lessons.findIndex((l) => l.userId === userId && l.lessonName === dto.lessonName);
        if (idx === -1)
            throw new common_1.NotFoundException('Ders bulunamadı');
        const { lessonName: _name, newLessonName, ...rest } = dto;
        lessons[idx] = {
            ...lessons[idx],
            ...rest,
            ...(newLessonName ? { lessonName: newLessonName } : {}),
        };
        this.write(lessons);
        return lessons[idx];
    }
    applyChecklistResult(id, userId, plannedHours, actualHours) {
        const lessons = this.read();
        const idx = lessons.findIndex((l) => l.id === id && l.userId === userId);
        if (idx === -1)
            throw new common_1.NotFoundException('Ders bulunamadı');
        if (actualHours !== null) {
            const R = plannedHours - actualHours;
            if (R !== 0) {
                lessons[idx].delay += 1;
            }
        }
        else {
            lessons[idx].delay += 1;
        }
        this.write(lessons);
        return lessons[idx];
    }
    remove(id, userId) {
        const lessons = this.read();
        const filtered = lessons.filter((l) => !(l.id === id && l.userId === userId));
        if (filtered.length === lessons.length)
            throw new common_1.NotFoundException('Ders bulunamadı');
        this.write(filtered);
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)()
], LessonService);
//# sourceMappingURL=lesson.service.js.map