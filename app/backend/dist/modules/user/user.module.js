"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_js_1 = require("./user.entity.js");
const user_service_js_1 = require("./user.service.js");
const user_controller_js_1 = require("./user.controller.js");
const lesson_entity_js_1 = require("../lesson/lesson.entity.js");
const checklist_entity_js_1 = require("../checklist/checklist.entity.js");
const schedule_entity_js_1 = require("../planner/schedule.entity.js");
let UserModule = class UserModule {
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([user_entity_js_1.UserEntity, lesson_entity_js_1.LessonEntity, checklist_entity_js_1.ChecklistEntity, schedule_entity_js_1.ScheduleEntity])],
        providers: [user_service_js_1.UserService],
        controllers: [user_controller_js_1.UserController],
        exports: [user_service_js_1.UserService],
    })
], UserModule);
//# sourceMappingURL=user.module.js.map