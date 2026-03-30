"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_entity_js_1 = require("./schedule.entity.js");
const planner_service_js_1 = require("./planner.service.js");
const planner_controller_js_1 = require("./planner.controller.js");
const heuristic_module_js_1 = require("../heuristic/heuristic.module.js");
const lesson_module_js_1 = require("../lesson/lesson.module.js");
const user_module_js_1 = require("../user/user.module.js");
const checklist_module_js_1 = require("../checklist/checklist.module.js");
let PlannerModule = class PlannerModule {
};
exports.PlannerModule = PlannerModule;
exports.PlannerModule = PlannerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([schedule_entity_js_1.ScheduleEntity]),
            heuristic_module_js_1.HeuristicModule,
            lesson_module_js_1.LessonModule,
            user_module_js_1.UserModule,
            checklist_module_js_1.ChecklistModule,
        ],
        providers: [planner_service_js_1.PlannerService],
        controllers: [planner_controller_js_1.PlannerController],
    })
], PlannerModule);
//# sourceMappingURL=planner.module.js.map