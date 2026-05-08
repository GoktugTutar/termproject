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
exports.DebugController = void 0;
const common_1 = require("@nestjs/common");
const time_util_1 = require("../utils/time.util");
let DebugController = class DebugController {
    getMode() {
        return {
            mode: process.env.MODE === 'test' ? 'test' : 'prod',
            current: (0, time_util_1.getCurrentTime)().toISOString(),
        };
    }
    setClock(body) {
        if (process.env.MODE !== 'test') {
            return { current: 'not in test mode' };
        }
        if (!body?.datetime) {
            (0, time_util_1.setTestTimeOverride)(null);
            return { current: 'reset' };
        }
        const dt = new Date(body.datetime);
        (0, time_util_1.setTestTimeOverride)(dt);
        return { current: dt.toISOString() };
    }
};
exports.DebugController = DebugController;
__decorate([
    (0, common_1.Get)('mode'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], DebugController.prototype, "getMode", null);
__decorate([
    (0, common_1.Post)('clock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], DebugController.prototype, "setClock", null);
exports.DebugController = DebugController = __decorate([
    (0, common_1.Controller)('debug')
], DebugController);
//# sourceMappingURL=debug.controller.js.map