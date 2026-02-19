"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error("[ErrorHandler]", err.message);
    res.status(500).json({ error: "Internal server error" });
}
//# sourceMappingURL=errorHandler.js.map