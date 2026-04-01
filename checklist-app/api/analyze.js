export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { companyInfo, answers, blockScores, totalScore, blocks } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: "GROQ_API_KEY не настроен" });

  const levelLabel =
    totalScore <= 40 ? "Критический 🔴" :
    totalScore <= 60 ? "Развивающийся 🟡" :
    totalScore <= 80 ? "Зрелый 🟢" : "Передовой 🔵";

  // Полный контекст: текст вопроса + текст выбранного ответа
  const detailedAnswers = (blocks || []).map(b => {
    const lines = b.questions.map(q => {
      const pts = answers[q.id] || 0;
      const selectedAnswer = pts > 0 ? q.answers[pts - 1] : "нет ответа";
      const flag = pts <= 2 ? " ⚠️" : pts === 4 ? " ✅" : "";
      return `  ${q.id} [${pts}/4]${flag} ${q.text}\n     → «${selectedAnswer}»`;
    }).join("\n");
    return `БЛОК ${b.id} «${b.title}» — ${blockScores[b.id]}/20 (целевой: 16/20):\n${lines}`;
  }).join("\n\n");

  const systemPrompt = `Ты — опытный консультант РЦК (Региональный центр компетенций) по производительности труда Ростовской области. Специализация: lean-производство, бережливое управление, диагностика предприятий МСП. Всегда отвечай на русском языке. Пиши конкретно, профессионально, с цифрами. Не используй слова-заглушки.`;

  const userPrompt = `Проведи экспертный анализ результатов чек-листа «Здоровье бизнеса».

ПРЕДПРИЯТИЕ:
- Название: ${companyInfo.name || "не указано"}
- Отрасль: ${companyInfo.industry || "не указана"}
- Должность: ${companyInfo.position || "не указана"}
- Сотрудников: ${companyInfo.employees || "не указано"}

ИТОГ: ${totalScore}/100 — уровень «${levelLabel}»
${(blocks||[]).map(b => `«${b.title}» ${blockScores[b.id]}/20`).join(" | ")}

ДЕТАЛЬНЫЕ ОТВЕТЫ (⚠️ = проблема 1-2 балла, ✅ = норма 4 балла):
${detailedAnswers}

ПРАВИЛА АНАЛИЗА:
- Ссылайся на конкретные ответы (цитируй их)
- Используй lean-терминологию: муда, 5S, SMED, VSM, ТОиР, KPI, OEE, WIP
- Давай измеримые результаты: "сокращение простоев на 30-40%", "рост OEE с 60% до 85%"
- Называй конкретные инструменты и методы, не общие слова

## 🔍 Общая оценка
[2-3 предложения с конкретными наблюдениями по ответам]

## ⚡ Ключевые болевые точки
[4-5 проблем — каждая со ссылкой на конкретный ответ из анкеты]

## 🛠 Приоритетные рекомендации
[5 действий строго в формате: ЧТО сделать → инструмент/метод → измеримый результат]

## 📋 Услуги РЦК
[3-4 услуги с обоснованием через конкретные ответы. Из списка: повышение производительности, обучение инструментам БП, руководитель проектного офиса, целеполагание и KPI, управление качеством, бережливые продажи, диагностика и аудит, внедрение MES/ERP, цифровой двойник, консультационное сопровождение, бизнес-план]

## 🚀 Первые 30 дней
[3 шага: кто отвечает + что делает + измеримый результат через 30 дней]`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Retry logic: пробуем дважды при ошибке
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1800,
          temperature: 0.4, // снизили для стабильности
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        if (attempt < 2) continue; // retry
        res.write(`data: ${JSON.stringify({ error: "Groq API: " + err })}\n\n`);
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
          } catch(_) {}
        }
      }
      return res.end();

    } catch (err) {
      if (attempt < 2) continue; // retry
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      return res.end();
    }
  }
}
