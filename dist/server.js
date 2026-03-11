"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const recommender_1 = require("./recommender");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.post("/api/recommend", (req, res) => {
    const { style, family, area, likes, dislikes } = req.body;
    if (!style?.length || !family || !area?.length) {
        res.status(400).json({ error: "必須項目が不足しています" });
        return;
    }
    try {
        const plan = (0, recommender_1.buildPlan)({ style, family, area, likes: likes ?? [], dislikes: dislikes ?? [] });
        res.json(plan);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌸 名古屋休日プランナー起動中: http://localhost:${PORT}`);
});
