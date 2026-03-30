"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const checklist_entity_js_1 = require("./checklist.entity.js");
const checklist_service_js_1 = require("./checklist.service.js");
const checklist_controller_js_1 = require("./checklist.controller.js");
const lesson_module_js_1 = require("../lesson/lesson.module.js");
const schedule_entity_js_1 = require("../planner/schedule.entity.js");
let ChecklistModule = class ChecklistModule {
};
exports.ChecklistModule = ChecklistModule;
exports.ChecklistModule = ChecklistModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([checklist_entity_js_1.ChecklistEntity, schedule_entity_js_1.ScheduleEntity]),
            lesson_module_js_1.LessonModule,
        ],
        providers: [checklist_service_js_1.ChecklistService],
        controllers: [checklist_controller_js_1.ChecklistController],
        exports: [checklist_service_js_1.ChecklistService],
    })
], ChecklistModule);
//# sourceMappingURL=checklist.module.js.map