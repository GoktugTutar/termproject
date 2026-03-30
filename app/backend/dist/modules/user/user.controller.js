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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const user_service_js_1 = require("./user.service.js");
const update_user_profile_dto_js_1 = require("./dto/update-user-profile.dto.js");
const user_entity_js_1 = require("./user.entity.js");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    updateProfile(user, dto) {
        return this.userService.updateProfile(user.id, dto);
    }
    delete(user) {
        return this.userService.delete(user.id);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Put)('update'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity,
        update_user_profile_dto_js_1.UpdateUserProfileDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('delete'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_js_1.UserEntity]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "delete", null);
exports.UserController = UserController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard),
    (0, common_1.Controller)('person'),
    __metadata("design:paramtypes", [user_service_js_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map