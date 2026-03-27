"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysBetween = daysBetween;
exports.isDatePast = isDatePast;
exports.todayStr = todayStr;
function daysBetween(from, to) {
    const diffMs = to.getTime() - from.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
function isDatePast(date) {
    return new Date(date) < new Date();
}
function todayStr() {
    return new Date().toISOString().split('T')[0];
}
//# sourceMappingURL=date.utils.js.map