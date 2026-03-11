"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlan = buildPlan;
const data_1 = require("./data");
function scoreSpot(spot, req) {
    let score = 0;
    // Area match (high priority)
    const areaMatch = req.area.some((a) => spot.areaTag.includes(a));
    if (areaMatch)
        score += 40;
    else
        return -100; // Exclude spots outside requested areas
    // Style match
    req.style.forEach((s) => {
        if (spot.styleTag.includes(s))
            score += 20;
    });
    // Family match
    if (spot.familyTag.includes("全員") ||
        spot.familyTag.includes(req.family)) {
        score += 15;
    }
    else {
        score -= 10;
    }
    // Likes match
    req.likes.forEach((like) => {
        if (spot.likeTag.includes(like))
            score += 10;
    });
    // Dislike penalty
    req.dislikes.forEach((dislike) => {
        if (spot.dislikeAvoid.includes(dislike))
            score -= 30;
    });
    return score;
}
function scoreRestaurant(r, req) {
    let score = 0;
    // Area match
    const areaMatch = req.area.some((a) => r.areaTag.includes(a));
    if (areaMatch)
        score += 30;
    // Style match
    req.style.forEach((s) => {
        if (r.styleTag.includes(s))
            score += 15;
    });
    // Family match
    if (r.familyTag.includes("全員") || r.familyTag.includes(req.family)) {
        score += 10;
    }
    // Dislike penalty
    req.dislikes.forEach((d) => {
        if (r.dislikeAvoid.includes(d))
            score -= 40;
    });
    return score;
}
function pickTop(items, scorer, count) {
    return items
        .map((item) => ({ item, score: scorer(item) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(({ item }) => item);
}
function generateTitle(req) {
    const styleMap = {
        "文化・歴史探訪": "歴史めぐり",
        "グルメ・食べ歩き": "食いだおれ",
        "アクティブ・スポーツ": "アクティブ",
        "のんびり・リラックス": "のんびり癒し",
        "ショッピング・おでかけ": "ショッピング",
        "自然・アウトドア": "緑と自然",
        "アート・エンタメ": "アート＆エンタメ",
        "カフェ・スイーツ巡り": "カフェ巡り",
    };
    const familyMap = {
        "一人（ソロ）": "ソロ旅",
        "カップル・夫婦（二人）": "二人旅",
        "友人グループ（大人のみ）": "グループ旅",
        "家族（小さな子ども連れ）": "ファミリー旅",
        "家族（中高生連れ）": "家族旅",
        "シニア・高齢者と": "ゆったり旅",
    };
    const styleLabel = styleMap[req.style[0]] || req.style[0];
    const familyLabel = familyMap[req.family] || req.family;
    return `名古屋${styleLabel}${familyLabel}プラン`;
}
function generateSummary(req, spots, restaurants) {
    const areaNames = req.area.join("・");
    const styleNames = req.style.slice(0, 2).join("と");
    const spotCount = spots.length;
    return `${areaNames}を中心に、${styleNames}を楽しむ充実した一日プランです。${spotCount}か所のスポットを巡りながら、名古屋ならではの魅力を堪能しましょう。`;
}
function generateAdvice(req) {
    const advices = [];
    if (req.dislikes.includes("混雑した場所")) {
        advices.push("混雑を避けるため、なるべく平日や開館直後の訪問をおすすめします。");
    }
    if (req.dislikes.includes("長時間の歩行")) {
        advices.push("地下鉄が充実しているので、無理に歩かずコミュニティバスや地下鉄を積極活用しましょう。");
    }
    if (req.family === "家族（小さな子ども連れ）") {
        advices.push("各スポットのベビーカー対応状況を事前にHPで確認しておくと安心です。");
    }
    if (req.family === "シニア・高齢者と") {
        advices.push("スポット間の移動はこまめに休憩を取りながら、無理のないペースで楽しんでください。");
    }
    if (req.likes.includes("写真撮影・インスタ映え")) {
        advices.push("光の柔らかい午前中と夕方のゴールデンアワーが撮影に最適な時間帯です。");
    }
    if (advices.length === 0) {
        advices.push("名古屋の地下鉄は一日乗車券（620円）がお得。複数エリアをめぐるなら購入をおすすめします。");
    }
    advices.push("天候に合わせてプランを柔軟に調整しながら、名古屋の魅力を存分に楽しんでください！");
    return advices.join(" ");
}
const TIME_SLOTS = [
    { label: "午前 9:00〜11:30", category: "morning" },
    { label: "昼前 11:30〜13:00", category: "morning" },
    { label: "午後 13:00〜15:30", category: "afternoon" },
    { label: "夕方 15:30〜17:30", category: "afternoon" },
    { label: "夜 18:00〜20:00", category: "evening" },
];
function buildPlan(req) {
    // Score and pick top spots
    const scoredSpots = data_1.SPOTS.map((s) => ({ spot: s, score: scoreSpot(s, req) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
    // Pick 3-4 spots avoiding duplicates
    const chosen = [];
    const usedIds = new Set();
    // Prefer morning spots first
    for (const { spot } of scoredSpots) {
        if (chosen.length >= 4)
            break;
        if (!usedIds.has(spot.id) && spot.category === "morning") {
            chosen.push(spot);
            usedIds.add(spot.id);
        }
    }
    for (const { spot } of scoredSpots) {
        if (chosen.length >= 4)
            break;
        if (!usedIds.has(spot.id) && spot.category === "afternoon") {
            chosen.push(spot);
            usedIds.add(spot.id);
        }
    }
    for (const { spot } of scoredSpots) {
        if (chosen.length >= 4)
            break;
        if (!usedIds.has(spot.id) && (spot.category === "any" || spot.category === "evening")) {
            chosen.push(spot);
            usedIds.add(spot.id);
        }
    }
    // Fill remaining with highest scored if not enough
    for (const { spot } of scoredSpots) {
        if (chosen.length >= 3)
            break;
        if (!usedIds.has(spot.id)) {
            chosen.push(spot);
            usedIds.add(spot.id);
        }
    }
    // Map to schedule items
    const schedule = chosen.map((spot, i) => ({
        time: TIME_SLOTS[Math.min(i * 1.2 | 0, TIME_SLOTS.length - 1)].label,
        spot: spot.name,
        area: spot.area,
        description: spot.description,
        duration: spot.duration,
        transport: spot.transport,
        tips: spot.tips,
    }));
    // Add evening spot if style includes nightlife
    const wantsEvening = req.style.includes("アート・エンタメ") ||
        req.likes.includes("夜景・ライトアップ");
    if (wantsEvening && chosen.length < 5) {
        const eveningSpots = data_1.SPOTS.filter((s) => s.category === "evening" &&
            !usedIds.has(s.id) &&
            req.area.some((a) => s.areaTag.includes(a)));
        if (eveningSpots.length > 0) {
            const es = eveningSpots[0];
            schedule.push({
                time: "夜 18:00〜20:00",
                spot: es.name,
                area: es.area,
                description: es.description,
                duration: es.duration,
                transport: es.transport,
                tips: es.tips,
            });
        }
    }
    // Pick restaurants
    const lunchCandidates = data_1.RESTAURANTS.filter((r) => r.type === "昼食" || r.type === "ランチ");
    const dinnerCandidates = data_1.RESTAURANTS.filter((r) => r.type === "夕食" || r.type === "ディナー");
    const topLunch = pickTop(lunchCandidates, (r) => scoreRestaurant(r, req), 1);
    const topDinner = pickTop(dinnerCandidates, (r) => scoreRestaurant(r, req), 1);
    const meals = [];
    if (topLunch[0]) {
        meals.push({
            type: "昼食",
            spot: topLunch[0].name,
            area: topLunch[0].area,
            description: topLunch[0].description,
            budget: topLunch[0].budget,
        });
    }
    if (topDinner[0]) {
        meals.push({
            type: "夕食",
            spot: topDinner[0].name,
            area: topDinner[0].area,
            description: topDinner[0].description,
            budget: topDinner[0].budget,
        });
    }
    // Calculate budget estimate
    const lunchBudget = topLunch[0]?.budget.split("〜")[0].replace(/[^0-9]/g, "") || "1000";
    const dinnerBudget = topDinner[0]?.budget.split("〜")[0].replace(/[^0-9]/g, "") || "1500";
    const transportCost = 700;
    const spotEntrance = req.style.includes("文化・歴史探訪") ||
        req.likes.includes("水族館・動物園・博物館")
        ? 1500
        : 500;
    const totalBudgetNum = Number(lunchBudget) + Number(dinnerBudget) + transportCost + spotEntrance;
    const totalBudget = `約${Math.round(totalBudgetNum / 100) * 100}〜${Math.round((totalBudgetNum * 1.5) / 100) * 100}円`;
    return {
        title: generateTitle(req),
        summary: generateSummary(req, chosen, [...topLunch, ...topDinner]),
        schedule,
        meals,
        totalBudget,
        advice: generateAdvice(req),
    };
}
