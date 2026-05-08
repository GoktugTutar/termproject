"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTestTimeOverride = setTestTimeOverride;
exports.getCurrentTime = getCurrentTime;
let _testOverride = null;
function setTestTimeOverride(dt) {
    _testOverride = dt;
}
function getCurrentTime() {
    if (process.env.MODE === 'test') {
        if (_testOverride)
            return new Date(_testOverride);
        if (process.env.TEST_CURRENT_TIME) {
            return new Date(process.env.TEST_CURRENT_TIME);
        }
    }
    return new Date();
}
//# sourceMappingURL=time.util.js.map