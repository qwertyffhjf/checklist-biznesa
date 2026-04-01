// api/analyze.js — Vercel Serverless Function
// Groq API key хранится в переменных окружения Vercel, в коде его нет

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { companyInfo, answers, blockScores, totalScore } = req.body;

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY не настроен в переменных окружения Vercel" });
  }

  const BLOCKS_META = [
    { id: 1, title: "Стратегия и цели" },
    { id: 2, title: "Производство" },
    { id: 3, title: "Продажи и клиенты" },
    { id: 4, title: "Закупки и склад" },
    { id: 5, title: "Команда и мотивация" },
  ];

  const blockSummary = BLOCKS_META.map(b =>
    `Блок ${b.id} «${b.title}»: ${blockScores[b.id]}/20`
  ).join(" | ");

  const answerLines = Object.entries(answers)
    .map(([qid, pts]) => `  ${qid}: ${pts}/4 балла`)
    .join("\n");

  const levelLabel =
    totalScore <= 40 ? "Критический" :
    totalScore <= 60 ? "Развивающийся" :
    totalScore <= 80 ? "Зрелый" : "Передовой";

  const prompt = `Ты — эксперт РЦК (Регионального центра компетенций) по производительности труда и lean-производству.
Проведи анализ чек-листа «Здоровье бизнеса» и дай конкретные рекомендации.

ДАННЫЕ О ПРЕДПРИЯТИИ:
- Название: ${companyInfo.name || "не указано"}
- Отрасль: ${companyInfo.industry || "не указана"}
- Должность: ${companyInfo.position || "не указана"}
- Сотрудников: ${companyInfo.employees || "не указано"}

РЕЗУЛЬТАТЫ: ${totalScore}/100 — ${levelLabel}
${blockSummary}

БАЛЛЫ ПО ВОПРОСАМ:
${answerLines}

Напиши структурированный анализ:

## Общая оценка
[2-3 предложения о ситуации]

## Ключевые проблемы
[3-5 конкретных болевых точек на основе низких баллов]

## Приоритетные рекомендации
[5 конкретных действий: ЧТО делать, КАК, РЕЗУЛЬТАТ]

## Подходящие услуги РЦК
[3-5 услуг с обоснованием]

## Первые 30 дней
[3 конкретных шага которые можно начать прямо сейчас]`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      res.write(`data: ${JSON.stringify({ error: err })}\n\n`);
      return res.end();
    }

    const reader = groqRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content;
          if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
        } catch (_) {}
      }
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
