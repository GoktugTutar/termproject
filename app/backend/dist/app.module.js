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
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_js_1 = require("./modules/auth/auth.module.js");
const user_module_js_1 = require("./modules/user/user.module.js");
const lesson_module_js_1 = require("./modules/lesson/lesson.module.js");
const heuristic_module_js_1 = require("./modules/heuristic/heuristic.module.js");
const planner_module_js_1 = require("./modules/planner/planner.module.js");
const checklist_module_js_1 = require("./modules/checklist/checklist.module.js");
const user_entity_js_1 = require("./modules/user/user.entity.js");
const lesson_entity_js_1 = require("./modules/lesson/lesson.entity.js");
const checklist_entity_js_1 = require("./modules/checklist/checklist.entity.js");
const schedule_entity_js_1 = require("./modules/planner/schedule.entity.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST', 'localhost'),
                    port: config.get('DB_PORT', 5432),
                    username: config.get('DB_USER', 'postgres'),
                    password: config.get('DB_PASSWORD', 'postgres'),
                    database: config.get('DB_NAME', 'termproject'),
                    entities: [user_entity_js_1.UserEntity, lesson_entity_js_1.LessonEntity, checklist_entity_js_1.ChecklistEntity, schedule_entity_js_1.ScheduleEntity],
                    synchronize: true,
                }),
            }),
            auth_module_js_1.AuthModule,
            user_module_js_1.UserModule,
            lesson_module_js_1.LessonModule,
            heuristic_module_js_1.HeuristicModule,
            planner_module_js_1.PlannerModule,
            checklist_module_js_1.ChecklistModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map