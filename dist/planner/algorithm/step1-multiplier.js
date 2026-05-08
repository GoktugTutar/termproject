"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step1Multiplier = step1Multiplier;
function step1Multiplier(weekloadFeedback) {
    switch (weekloadFeedback) {
        case 'cok_yogundu':
            return 0.85;
        case 'yetersizdi':
            return 1.10;
        case 'tam_uygundu':
        default:
            return 1.00;
    }
}
//# sourceMappingURL=step1-multiplier.js.map