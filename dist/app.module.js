"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./user/user.module");
const lesson_module_1 = require("./lesson/lesson.module");
const planner_module_1 = require("./planner/planner.module");
const checklist_module_1 = require("./checklist/checklist.module");
const feedback_module_1 = require("./feedback/feedback.module");
const system_feedback_module_1 = require("./system-feedback/system-feedback.module");
const debug_controller_1 = require("./debug/debug.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            lesson_module_1.LessonModule,
            planner_module_1.PlannerModule,
            checklist_module_1.ChecklistModule,
            feedback_module_1.FeedbackModule,
            system_feedback_module_1.SystemFeedbackModule,
        ],
        controllers: [debug_controller_1.DebugController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map