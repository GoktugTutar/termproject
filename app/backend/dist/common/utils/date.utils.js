"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysBetween = daysBetween;
exports.todayString = todayString;
exports.getDayName = getDayName;
exports.isMonday = isMonday;
exports.parseTimeRange = parseTimeRange;
exports.formatTimeRange = formatTimeRange;
function daysBetween(from, to) {
    const ms = to.getTime() - from.getTime();
    return ms / (1000 * 60 * 60 * 24);
}
function todayString() {
    return new Date().toISOString().split('T')[0];
}
function getDayName(date = new Date()) {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}
function isMonday(date = new Date()) {
    return date.getDay() === 1;
}
function parseTimeRange(range) {
    const [start, end] = range.split('-').map(Number);
    return { start, end };
}
function formatTimeRange(start, end) {
    return `${start}-${end}`;
}
//# sourceMappingURL=date.utils.js.map