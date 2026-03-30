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
exports.ChecklistController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const checklist_service_js_1 = require("./checklist.service.js");
const submit_checklist_dto_js_1 = require("./dto/submit-checklist.dto.js");
const user_entity_js_1 = require("../user/user.entity.js");
let ChecklistController = class ChecklistController {
    checklistService;
    constructor(checklistService) {
        this.checklistService = checklistService;
    }
    create(user) {
        return this.checklistService.createForToday(user.id);
    }
    get(user) {
        return this.checklistService.getTodayChecklist(user.id);
    }
    submit(user, dto) {
        return this.checklistService.submit(user.id, dto);
    }
};
exports.ChecklistController = ChecklistController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('get'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "get", null);
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)('submit'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity, submit_checklist_dto_js_1.SubmitChecklistDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "submit", null);
exports.ChecklistController = ChecklistController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.Controller)('checklist'),
    __metadata("design:paramtypes", [checklist_service_js_1.ChecklistService])
], ChecklistController);
//# sourceMappingURL=checklist.controller.js.map