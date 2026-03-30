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
exports.SubmitChecklistDto = exports.LessonSubmissionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class LessonSubmissionDto {
    lessonId;
    hoursCompleted;
}
exports.LessonSubmissionDto = LessonSubmissionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LessonSubmissionDto.prototype, "lessonId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LessonSubmissionDto.prototype, "hoursCompleted", void 0);
class SubmitChecklistDto {
    lessons;
}
exports.SubmitChecklistDto = SubmitChecklistDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => LessonSubmissionDto),
    __metadata("design:type", Array)
], SubmitChecklistDto.prototype, "lessons", void 0);
//# sourceMappingURL=submit-checklist.dto.js.map