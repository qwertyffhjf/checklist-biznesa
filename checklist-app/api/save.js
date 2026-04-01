// api/save.js — сохранение в Google Sheets через Apps Script webhook
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { companyInfo, answers, blockScores, totalScore, aiAnalysis } = req.body;
  const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL;

  if (!SHEETS_URL) {
    // Если webhook не настроен — просто отвечаем OK, не ломаем приложение
    return res.status(200).json({ ok: true, note: "SHEETS_WEBHOOK_URL не настроен" });
  }

  const level =
    totalScore <= 40 ? "Критический" :
    totalScore <= 60 ? "Развивающийся" :
    totalScore <= 80 ? "Зрелый" : "Передовой";

  const row = {
    timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
    name: companyInfo.name || "",
    industry: companyInfo.industry || "",
    position: companyInfo.position || "",
    employees: companyInfo.employees || "",
    total: totalScore,
    level,
    block1: blockScores[1] || 0,
    block2: blockScores[2] || 0,
    block3: blockScores[3] || 0,
    block4: blockScores[4] || 0,
    block5: blockScores[5] || 0,
    // Все 25 ответов
    ...Object.fromEntries(
      Object.entries(answers).map(([qid, pts]) => [qid.replace(".", "_"), pts])
    ),
    ai_analysis: (aiAnalysis || "").slice(0, 1000), // обрезаем чтобы не переполнить ячейку
  };

  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Sheets error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
