"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const planner_service_js_1 = require("./planner.service.js");
const user_entity_js_1 = require("../user/user.entity.js");
let PlannerController = class PlannerController {
    plannerService;
    constructor(plannerService) {
        this.plannerService = plannerService;
    }
    create(user) {
        return this.plannerService.create(user.id);
    }
    getSchedule(user) {
        return this.plannerService.getSchedule(user.id);
    }
};
exports.PlannerController = PlannerController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('schedule'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "getSchedule", null);
exports.PlannerController = PlannerController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.Controller)('planner'),
    __metadata("design:paramtypes", [planner_service_js_1.PlannerService])
], PlannerController);
//# sourceMappingURL=planner.controller.js.map