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
const planner_service_1 = require("./planner.service");
const planner_controller_1 = require("./planner.controller");
const user_module_1 = require("../user/user.module");
const lesson_module_1 = require("../lesson/lesson.module");
const heuristic_module_1 = require("../heuristic/heuristic.module");
let PlannerModule = class PlannerModule {
};
exports.PlannerModule = PlannerModule;
exports.PlannerModule = PlannerModule = __decorate([
    (0, common_1.Module)({
        imports: [user_module_1.UserModule, lesson_module_1.LessonModule, heuristic_module_1.HeuristicModule],
        providers: [planner_service_1.PlannerService],
        controllers: [planner_controller_1.PlannerController],
    })
], PlannerModule);
//# sourceMappingURL=planner.module.js.map