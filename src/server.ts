import express, { Request, Response } from "express";
import path from "path";
import { buildPlan, PlanRequest } from "./recommender";

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.post("/api/recommend", (req: Request, res: Response) => {
  const { style, family, area, likes, dislikes }: PlanRequest = req.body;

  if (!style?.length || !family || !area?.length) {
    res.status(400).json({ error: "必須項目が不足しています" });
    return;
  }

  try {
    const plan = buildPlan({ style, family, area, likes: likes ?? [], dislikes: dislikes ?? [] });
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌸 名古屋休日プランナー起動中: http://localhost:${PORT}`);
});
