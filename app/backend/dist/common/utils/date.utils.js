"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysBetween = daysBetween;
exports.isExamPast = isExamPast;
exports.todayStr = todayStr;
exports.timeToMinutes = timeToMinutes;
exports.minutesToTime = minutesToTime;
function daysBetween(from, to) {
    const diffMs = to.getTime() - from.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
function isExamPast(examDate) {
    return new Date(examDate) < new Date();
}
function todayStr() {
    return new Date().toISOString().split('T')[0];
}
function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}
function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
//# sourceMappingURL=date.utils.js.map