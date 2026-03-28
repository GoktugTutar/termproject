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
const checklist_service_1 = require("./checklist.service");
const submit_checklist_dto_1 = require("./dto/submit-checklist.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SlotDto {
    lessonId;
    lessonName;
    hours;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlotDto.prototype, "lessonId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SlotDto.prototype, "lessonName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SlotDto.prototype, "hours", void 0);
class CreateChecklistDto {
    slots;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SlotDto),
    __metadata("design:type", Array)
], CreateChecklistDto.prototype, "slots", void 0);
let ChecklistController = class ChecklistController {
    checklistService;
    constructor(checklistService) {
        this.checklistService = checklistService;
    }
    getAll(req) {
        return this.checklistService.getAll(req.user.sub);
    }
    getToday(req) {
        return this.checklistService.getToday(req.user.sub);
    }
    create(req, dto) {
        return this.checklistService.createFromSlots(req.user.sub, dto.slots);
    }
    submit(req, dto) {
        return this.checklistService.submit(req.user.sub, dto);
    }
};
exports.ChecklistController = ChecklistController;
__decorate([
    (0, common_1.Get)('get'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('today'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "getToday", null);
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateChecklistDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('submit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_checklist_dto_1.SubmitChecklistDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "submit", null);
exports.ChecklistController = ChecklistController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('checklist'),
    __metadata("design:paramtypes", [checklist_service_1.ChecklistService])
], ChecklistController);
//# sourceMappingURL=checklist.controller.js.map