"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step7CognitiveLoad = step7CognitiveLoad;
function step7CognitiveLoad(orderedLessons) {
    const kritik = orderedLessons.filter((l) => l.priority === 'KRITIK');
    const others = orderedLessons.filter((l) => l.priority !== 'KRITIK');
    const hard = others.filter((l) => l.difficulty >= 4);
    const easy = others.filter((l) => l.difficulty <= 2);
    const medium = others.filter((l) => l.difficulty === 3);
    return [...kritik, ...hard, ...easy, ...medium];
}
//# sourceMappingURL=step7-cognitive-load.js.map