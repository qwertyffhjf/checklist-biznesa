// api/save.js — сохранение в Sheets + письма через Resend
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { companyInfo, answers, blockScores, totalScore, aiAnalysis, blocks, managerEmail, followUpDays } = req.body;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SHEETS_URL = process.env.SHEETS_WEBHOOK_URL;

  const level = totalScore <= 40 ? "🔴 Критический" : totalScore <= 60 ? "🟡 Развивающийся" : totalScore <= 80 ? "🟢 Зрелый" : "🔵 Передовой";
  const blockNames = { 1:"Стратегия и цели", 2:"Производство", 3:"Продажи и клиенты", 4:"Закупки и склад", 5:"Команда и мотивация" };

  // ── 1. GOOGLE SHEETS ──────────────────────────────────────────────────────
  if (SHEETS_URL) {
    const row = {
      timestamp: new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }),
      name: companyInfo.name||"", industry: companyInfo.industry||"",
      position: companyInfo.position||"", employees: companyInfo.employees||"",
      total: totalScore, level: level.replace(/[🔴🟡🟢🔵]/g,"").trim(),
      block1: blockScores[1]||0, block2: blockScores[2]||0, block3: blockScores[3]||0,
      block4: blockScores[4]||0, block5: blockScores[5]||0,
      ...Object.fromEntries(Object.entries(answers||{}).map(([k,v])=>[k.replace(".","_"),v])),
      ai_analysis: (aiAnalysis||"").slice(0,1000),
      phone: companyInfo.phone||"", email: companyInfo.email||"",
      follow_up_days: followUpDays??3,
      blocks_json: JSON.stringify((blocks||[]).map(b=>({ title:b.title, questions:b.questions.map(q=>({ id:q.id, text:q.text, answer:q.answers[(answers?.[q.id]||1)-1]||"", score:answers?.[q.id]||0 })) }))),
    };
    try {
      const r = await fetch(SHEETS_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(row) });
      console.log("Sheets:", r.status);
    } catch(e) { console.error("Sheets error:", e.message); }
  }

  // ── 2. ПИСЬМА ЧЕРЕЗ RESEND ────────────────────────────────────────────────
  if (!RESEND_KEY) return res.status(200).json({ ok: true, note: "Resend не настроен" });

  const mgr = managerEmail || process.env.MANAGER_EMAIL || "";
  const userEmail = companyInfo.email || "";

  // Определяем услуги РЦК
  const svc = [];
  if ((blockScores[1]||0) < 10) svc.push("Совершенствование системы целеполагания");
  if ((blockScores[2]||0) < 10) svc.push("Реализация проектов по повышению производительности", "Диагностика и аудит производственных систем");
  if ((answers||{})["2.2"] <= 2) svc.push("Совершенствование системы управления качеством");
  if ((blockScores[3]||0) < 10) svc.push("Развитие системы «Бережливые продажи»");
  if ((blockScores[4]||0) < 10) svc.push("Внедрение программных продуктов мониторинга");
  if ((blockScores[5]||0) < 10) svc.push("Обучение сотрудников инструментам БП");
  const services = [...new Set(svc)];

  // Блоки для таблицы
  const blockBars = Object.entries(blockScores).map(([id,s]) => {
    const c = s<=8?"#ef4444":s<=12?"#f59e0b":s<=16?"#22c55e":"#3b82f6";
    const pct = Math.round((s/20)*100);
    return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12px;color:#475569">${blockNames[id]}</span><span style="font-size:12px;font-weight:700;color:${c}">${s}/20</span></div><div style="height:5px;background:#e2e8f0;border-radius:99px"><div style="height:100%;width:${pct}%;background:${c};border-radius:99px"></div></div></div>`;
  }).join("");

  const aiHtml = (aiAnalysis||"")
    .replace(/## (.*)/g,'<h3 style="color:#4F6EF7;font-size:14px;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">$1</h3>')
    .replace(/^[›•-] (.*)/gm,'<p style="margin:4px 0;padding-left:10px;font-size:13px;color:#475569">• $1</p>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');

  // Письмо менеджеру
  if (mgr) {
    const detailRows = (blocks||[]).map(b => {
      const qRows = b.questions.map(q => {
        const pts = (answers||{})[q.id]||0;
        const c = pts<=2?"#ef4444":pts===3?"#f59e0b":"#22c55e";
        return `<tr><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:11px">${q.id}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:12px">${q.text}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">${q.answers[pts-1]||"—"}</td><td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${c};font-size:12px">${pts}/4</td></tr>`;
      }).join("");
      return `<tr style="background:#f1f5f9"><td colspan="3" style="padding:6px 8px;font-weight:700;font-size:12px">${b.title}</td><td style="padding:6px 8px;font-weight:800;color:${b.questions.reduce((s,q)=>s+((answers||{})[q.id]||0),0)<=8?"#ef4444":"#22c55e"};font-size:12px">${b.questions.reduce((s,q)=>s+((answers||{})[q.id]||0),0)}/20</td></tr>${qRows}`;
    }).join("");

    const mgrHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:16px"><div style="max-width:720px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#4F6EF7,#06B6D4);padding:20px 24px;color:#fff">
      <div style="font-size:11px;opacity:0.8;margin-bottom:2px">НОВЫЙ ЛИД · РЦК</div>
      <div style="font-size:20px;font-weight:700">${companyInfo.name||"Без названия"}</div>
      <div style="font-size:13px;opacity:0.85;margin-top:3px">${companyInfo.industry||""} · ${companyInfo.position||""}</div>
    </div>
    <div style="padding:20px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="color:#64748b;font-size:12px;padding:3px 0;width:120px">Телефон</td><td style="font-weight:600;font-size:13px">${companyInfo.phone||"не указан"}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:3px 0">Email</td><td style="font-size:13px">${companyInfo.email||"не указан"}</td></tr>
        <tr><td style="color:#64748b;font-size:12px;padding:3px 0">Сотрудников</td><td style="font-size:13px">${companyInfo.employees||"—"}</td></tr>
      </table>
      <div style="text-align:center;background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-size:40px;font-weight:800;color:#4F6EF7">${totalScore}</div>
        <div style="color:#94a3b8;font-size:11px">из 100 · ${level}</div>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:14px;margin-bottom:16px">
        <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:6px">Рекомендуемые услуги РЦК</div>
        <ul style="margin:0;padding-left:18px">${services.map(s=>`<li style="margin:3px 0;font-size:13px">${s}</li>`).join("")}</ul>
      </div>
      <div style="background:#fef3c7;border-radius:8px;padding:14px;margin-bottom:20px;border-left:4px solid #f59e0b">
        <div style="font-weight:700;font-size:13px;color:#92400e">Позвоните в течение 24 часов</div>
        ${companyInfo.phone?`<div style="margin-top:6px;font-size:16px;font-weight:800;color:#4F6EF7">${companyInfo.phone}</div>`:""}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#e2e8f0"><th style="padding:5px 8px;text-align:left;width:35px">#</th><th style="padding:5px 8px;text-align:left">Вопрос</th><th style="padding:5px 8px;text-align:left">Ответ</th><th style="padding:5px 8px;text-align:left;width:45px">Балл</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;padding:10px;text-align:center;color:#94a3b8;font-size:10px">РЦК · ${new Date().toLocaleString("ru-RU")}</div>
    </div></body></html>`;

    await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${RESEND_KEY}`},
      body:JSON.stringify({ from:"РЦК Диагностика <onboarding@resend.dev>", to:[mgr], subject:`🔔 Новый лид: ${companyInfo.name||"Без названия"} — ${totalScore}/100 ${level}`, html:mgrHtml }),
    }).then(r=>console.log("Manager email:", r.status)).catch(e=>console.error("Manager email error:", e.message));
  }

  // Письмо пользователю
  if (userEmail) {
    const userHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4F6EF7,#06B6D4);padding:32px;text-align:center;color:#fff">
      <div style="font-size:36px;margin-bottom:8px">🎯</div>
      <h1 style="margin:0;font-size:20px">Результаты диагностики</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:13px">Чек-лист «Здоровье бизнеса» · РЦК Ростовской области</p>
    </div>
    <div style="padding:28px">
      <p style="color:#475569;font-size:14px;margin:0 0 20px">Уважаемый ${companyInfo.position||"руководитель"}, здравствуйте!<br>Ниже — результаты диагностики предприятия <strong>${companyInfo.name||""}</strong>.</p>
      <div style="background:#f8fafc;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px">
        <div style="font-size:44px;font-weight:800;color:#4F6EF7;line-height:1">${totalScore}</div>
        <div style="color:#94a3b8;font-size:12px;margin-bottom:4px">из 100 баллов</div>
        <div style="font-size:15px;font-weight:700">${level}</div>
      </div>
      <div style="margin-bottom:20px">${blockBars}</div>
      <div style="border-top:2px solid #f1f5f9;padding-top:20px;margin-bottom:24px">${aiHtml}</div>
      <div style="background:#eff6ff;border-radius:12px;padding:24px;text-align:center">
        <div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:8px">Готовы обсудить результаты?</div>
        <p style="color:#475569;font-size:13px;margin:0 0 16px">Эксперт РЦК разберёт ваши слабые места и предложит конкретный план — <strong>бесплатно, 45 минут</strong>.</p>
        <a href="mailto:${mgr}" style="display:inline-block;padding:13px 30px;background:#4F6EF7;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Записаться на консультацию →</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:12px;text-align:center;color:#94a3b8;font-size:11px">РЦК Ростовской области · Письмо сформировано автоматически</div>
    </div></body></html>`;

    await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${RESEND_KEY}`},
      body:JSON.stringify({ from:"РЦК Ростовской области <onboarding@resend.dev>", to:[userEmail], subject:`Результаты диагностики — ${totalScore}/100 | РЦК`, html:userHtml }),
    }).then(r=>console.log("User email:", r.status)).catch(e=>console.error("User email error:", e.message));
  }

  return res.status(200).json({ ok: true });
}
