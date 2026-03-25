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
const checklist_service_1 = require("./checklist.service");
const checklist_controller_1 = require("./checklist.controller");
const lesson_module_1 = require("../lesson/lesson.module");
let ChecklistModule = class ChecklistModule {
};
exports.ChecklistModule = ChecklistModule;
exports.ChecklistModule = ChecklistModule = __decorate([
    (0, common_1.Module)({
        imports: [lesson_module_1.LessonModule],
        providers: [checklist_service_1.ChecklistService],
        controllers: [checklist_controller_1.ChecklistController],
    })
], ChecklistModule);
//# sourceMappingURL=checklist.module.js.map