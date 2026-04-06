// api/save.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL;
  if (!SHEETS_URL) {
    return res.status(200).json({ ok: true, note: "SHEETS_WEBHOOK_URL не настроен" });
  }

  const { companyInfo, answers, blockScores, totalScore, aiAnalysis, blocks } = req.body;

  const level =
    totalScore <= 40 ? "Критический" :
    totalScore <= 60 ? "Развивающийся" :
    totalScore <= 80 ? "Зрелый" : "Передовой";

  const row = {
    timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
    name:      companyInfo.name      || "",
    industry:  companyInfo.industry  || "",
    position:  companyInfo.position  || "",
    employees: companyInfo.employees || "",
    phone:     companyInfo.phone     || "",
    email:     companyInfo.email     || "",
    total:     totalScore,
    level,
    block1: blockScores[1] || 0,
    block2: blockScores[2] || 0,
    block3: blockScores[3] || 0,
    block4: blockScores[4] || 0,
    block5: blockScores[5] || 0,
    ...Object.fromEntries(
      Object.entries(answers || {}).map(([k, v]) => [k.replace(".", "_"), v])
    ),
    ai_analysis: (aiAnalysis || "").slice(0, 2000),
    manager_email: req.body.managerEmail || "",
    follow_up_days: req.body.followUpDays ?? 3,
    blocks_json: JSON.stringify((blocks || []).map(b => ({
      title: b.title,
      questions: b.questions.map(q => ({
        id: q.id,
        text: q.text,
        answer: q.answers[(answers?.[q.id] || 1) - 1] || "",
        score: answers?.[q.id] || 0,
      }))
    }))),
  };

  try {
    // ВАЖНО: await — ждём завершения до отправки ответа клиенту
    const resp = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    const text = await resp.text();
    console.log("Sheets response status:", resp.status, "body:", text.slice(0, 200));
    return res.status(200).json({ ok: true, status: resp.status });
  } catch (err) {
    console.error("Sheets/email error:", err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
