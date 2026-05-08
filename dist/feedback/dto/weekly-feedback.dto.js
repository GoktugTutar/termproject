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
exports.WeeklyFeedbackDto = exports.LessonFeedbackDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class LessonFeedbackDto {
    lessonId;
    needsMoreTime;
}
exports.LessonFeedbackDto = LessonFeedbackDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LessonFeedbackDto.prototype, "lessonId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LessonFeedbackDto.prototype, "needsMoreTime", void 0);
class WeeklyFeedbackDto {
    weekloadFeedback;
    lessonFeedbacks;
}
exports.WeeklyFeedbackDto = WeeklyFeedbackDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['cok_yogundu', 'tam_uygundu', 'yetersizdi']),
    __metadata("design:type", String)
], WeeklyFeedbackDto.prototype, "weekloadFeedback", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => LessonFeedbackDto),
    __metadata("design:type", Array)
], WeeklyFeedbackDto.prototype, "lessonFeedbacks", void 0);
//# sourceMappingURL=weekly-feedback.dto.js.map