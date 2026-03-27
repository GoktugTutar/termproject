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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitChecklistDto = void 0;
const class_validator_1 = require("class-validator");
class SubmitChecklistDto {
    lessonId;
    actualHours;
    status;
}
exports.SubmitChecklistDto = SubmitChecklistDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitChecklistDto.prototype, "lessonId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SubmitChecklistDto.prototype, "actualHours", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['early', 'completed', 'incomplete', 'not_done']),
    __metadata("design:type", String)
], SubmitChecklistDto.prototype, "status", void 0);
//# sourceMappingURL=submit-checklist.dto.js.map