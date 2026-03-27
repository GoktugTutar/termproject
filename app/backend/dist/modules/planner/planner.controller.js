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
const planner_service_1 = require("./planner.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const class_validator_1 = require("class-validator");
class DailyUpdateDto {
    freeHours;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], DailyUpdateDto.prototype, "freeHours", void 0);
let PlannerController = class PlannerController {
    plannerService;
    constructor(plannerService) {
        this.plannerService = plannerService;
    }
    createWeeklyPlan(req) {
        return this.plannerService.createWeeklyPlan(req.user.sub);
    }
    dailyUpdate(req, dto) {
        return this.plannerService.createDailyPlan(req.user.sub, dto.freeHours);
    }
};
exports.PlannerController = PlannerController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "createWeeklyPlan", null);
__decorate([
    (0, common_1.Post)('dailyupdate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, DailyUpdateDto]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "dailyUpdate", null);
exports.PlannerController = PlannerController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('planner'),
    __metadata("design:paramtypes", [planner_service_1.PlannerService])
], PlannerController);
//# sourceMappingURL=planner.controller.js.map