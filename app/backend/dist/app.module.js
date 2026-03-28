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
const auth_module_1 = require("./modules/auth/auth.module");
const user_module_1 = require("./modules/user/user.module");
const lesson_module_1 = require("./modules/lesson/lesson.module");
const heuristic_module_1 = require("./modules/heuristic/heuristic.module");
const planner_module_1 = require("./modules/planner/planner.module");
const checklist_module_1 = require("./modules/checklist/checklist.module");
const user_entity_1 = require("./modules/user/user.entity");
const lesson_entity_1 = require("./modules/lesson/lesson.entity");
const checklist_entity_1 = require("./modules/checklist/checklist.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST', 'localhost'),
                    port: config.get('DB_PORT', 5432),
                    username: config.get('DB_USERNAME', 'postgres'),
                    password: config.get('DB_PASSWORD', ''),
                    database: config.get('DB_NAME', 'termproject'),
                    entities: [user_entity_1.UserEntity, lesson_entity_1.LessonEntity, checklist_entity_1.ChecklistEntity],
                    synchronize: true,
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            lesson_module_1.LessonModule,
            heuristic_module_1.HeuristicModule,
            planner_module_1.PlannerModule,
            checklist_module_1.ChecklistModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map