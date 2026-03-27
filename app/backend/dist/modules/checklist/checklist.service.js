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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const lesson_service_1 = require("../lesson/lesson.service");
const DATA_PATH = path.join(__dirname, '../../data/checklists.json');
let ChecklistService = class ChecklistService {
    lessonService;
    constructor(lessonService) {
        this.lessonService = lessonService;
    }
    read() {
        try {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        }
        catch {
            return [];
        }
    }
    write(items) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2));
    }
    getAll(userId) {
        return this.read().filter((c) => c.userId === userId);
    }
    getToday(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.read().filter((c) => c.userId === userId && c.date === today);
    }
    createFromSlots(userId, slots) {
        const checklists = this.read();
        const today = new Date().toISOString().split('T')[0];
        const newItems = slots.map((slot) => ({
            id: (0, uuid_1.v4)(),
            userId,
            lessonId: slot.lessonId,
            lessonName: slot.lessonName,
            date: today,
            plannedHours: slot.hours,
            actualHours: null,
            status: 'pending',
            remaining: null,
            createdAt: new Date().toISOString(),
        }));
        checklists.push(...newItems);
        this.write(checklists);
        return newItems;
    }
    submit(userId, dto) {
        const items = this.read();
        const today = new Date().toISOString().split('T')[0];
        let item = items.find((c) => c.userId === userId && c.lessonId === dto.lessonId && c.date === today);
        if (!item) {
            const lesson = this.lessonService.findById(dto.lessonId);
            if (!lesson)
                throw new common_1.NotFoundException('Ders bulunamadı');
            item = {
                id: (0, uuid_1.v4)(),
                userId,
                lessonId: dto.lessonId,
                lessonName: lesson.lessonName,
                date: today,
                plannedHours: 0,
                actualHours: null,
                status: 'pending',
                remaining: null,
                createdAt: new Date().toISOString(),
            };
            items.push(item);
        }
        let remaining = null;
        const status = dto.status;
        if (status === 'not_done') {
            item.actualHours = 0;
            remaining = null;
        }
        else if (status === 'completed') {
            item.actualHours = item.plannedHours;
            remaining = 0;
        }
        else {
            item.actualHours = dto.actualHours ?? 0;
            remaining = item.plannedHours - item.actualHours;
        }
        item.status = status;
        item.remaining = remaining;
        this.write(items);
        this.lessonService.applyChecklistResult(dto.lessonId, userId, item.plannedHours, status === 'not_done' ? null : item.actualHours);
        return {
            ...item,
            remainingDisplay: this.formatRemaining(status, remaining),
        };
    }
    formatRemaining(status, remaining) {
        if (status === 'not_done')
            return 'inf';
        if (status === 'completed')
            return '0';
        if (remaining === null)
            return 'inf';
        if (remaining < 0)
            return `-${Math.abs(remaining)}`;
        return `${remaining}`;
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [lesson_service_1.LessonService])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map