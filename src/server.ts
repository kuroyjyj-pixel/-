import express, { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

interface PlanRequest {
  style: string[];
  family: string;
  area: string[];
  likes: string[];
  dislikes: string[];
}

app.post("/api/recommend", async (req: Request, res: Response) => {
  const { style, family, area, likes, dislikes }: PlanRequest = req.body;

  if (!style || !family || !area) {
    res.status(400).json({ error: "必須項目が不足しています" });
    return;
  }

  const prompt = `あなたは名古屋市の観光・レジャーに詳しいプランナーです。
以下の条件に基づいて、名古屋市での理想的な休日プランを提案してください。

【条件】
- 過ごしたいスタイル: ${style.join("、")}
- 家族構成: ${family}
- 希望エリア: ${area.join("、")}
- 好きなこと・興味: ${likes.length > 0 ? likes.join("、") : "特になし"}
- 苦手なこと・避けたいこと: ${dislikes.length > 0 ? dislikes.join("、") : "特になし"}

【要件】
1. 具体的なスポット名・施設名を含めること（名古屋市内の実在する場所）
2. 午前・午後・夜の時間帯に分けて提案すること
3. 移動手段や所要時間の目安を含めること
4. 食事スポットも1〜2か所提案すること
5. 各スポットの見どころや楽しみ方を具体的に説明すること
6. 予算の目安も記載すること

回答はJSON形式で返してください。以下の構造に従ってください：

{
  "title": "プランのタイトル（キャッチーな名前）",
  "summary": "プランの概要（2〜3文）",
  "schedule": [
    {
      "time": "時間帯（例：午前 9:00〜12:00）",
      "spot": "スポット名",
      "area": "エリア名",
      "description": "説明と楽しみ方",
      "duration": "滞在時間目安",
      "transport": "移動手段と所要時間（次の場所への移動）",
      "tips": "お役立ちヒント"
    }
  ],
  "meals": [
    {
      "type": "食事の種類（朝食/昼食/夕食）",
      "spot": "おすすめ店名",
      "area": "エリア名",
      "description": "おすすめメニューや雰囲気",
      "budget": "予算目安"
    }
  ],
  "totalBudget": "1人あたりの予算目安（交通費含む）",
  "advice": "このプランを楽しむためのアドバイス（2〜3文）"
}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thinking: { type: "adaptive" } as any,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌸 名古屋休日プランナー起動中: http://localhost:${PORT}`);
});
