import { useState, useRef } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { BLOCKS, getLevel, calcBlockScore } from "./data.js";

// ─── PDF ЭКСПОРТ ─────────────────────────────────────────────────────────────
function exportToPDF(companyInfo, blockScores, totalScore, aiText) {
  const level = getLevel(totalScore);
  const blockNames = { 1:"🎯 Стратегия и цели", 2:"🏭 Производство", 3:"💰 Продажи и клиенты", 4:"📦 Закупки и склад", 5:"👥 Команда и мотивация" };
  const TARGET = 16; // целевой балл по каждому блоку

  const blockRows = Object.entries(blockScores).map(([id, score]) => {
    const gap = TARGET - score;
    const color = score <= 8 ? "#ef4444" : score <= 12 ? "#f59e0b" : score <= 16 ? "#22c55e" : "#3b82f6";
    return `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${blockNames[id]}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${color}">${score}/20</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${TARGET}/20</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;color:${gap > 0 ? "#ef4444" : "#22c55e"}">${gap > 0 ? "−" + gap : "✅"}</td>
    </tr>`;
  }).join("");

  const aiHtml = (aiText || "")
    .replace(/## (.*)/g, '<h3 style="color:#6366f1;font-size:14px;margin:16px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">$1</h3>')
    .replace(/^[›•-] \*\*(.*?)\*\*[:：](.*)/gm, '<p style="margin:5px 0"><strong>$1</strong>:$2</p>')
    .replace(/^[›•-] (.*)/gm, '<p style="margin:4px 0;padding-left:10px">• $1</p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br>');

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
  <title>Диагностика — ${companyInfo.name || "РЦК"}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto;font-size:14px}
    h1{color:#6366f1;margin:0 0 4px;font-size:22px} table{width:100%;border-collapse:collapse}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:700;font-size:15px}
    @media print{.no-print{display:none}body{padding:20px}}
  </style></head><body>
  <h1>🎯 Чек-лист «Здоровье бизнеса» · РЦК</h1>
  <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">${new Date().toLocaleDateString("ru-RU", {day:"numeric",month:"long",year:"numeric"})}</p>

  <table style="margin-bottom:20px">
    <tr><td style="color:#64748b;padding:4px 16px 4px 0;width:130px">Предприятие</td><td style="font-weight:600">${companyInfo.name||"—"}</td></tr>
    <tr><td style="color:#64748b;padding:4px 16px 4px 0">Отрасль</td><td>${companyInfo.industry||"—"}</td></tr>
    <tr><td style="color:#64748b;padding:4px 16px 4px 0">Должность</td><td>${companyInfo.position||"—"}</td></tr>
    <tr><td style="color:#64748b;padding:4px 16px 4px 0">Сотрудников</td><td>${companyInfo.employees||"—"}</td></tr>
  </table>

  <div style="background:#f8fafc;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
    <div style="font-size:52px;font-weight:800;color:#6366f1;line-height:1">${totalScore}</div>
    <div style="color:#94a3b8;font-size:12px">из 100 баллов</div>
    <div style="font-size:17px;font-weight:700;margin:6px 0">${level.emoji} ${level.label}</div>
    <div style="color:#64748b;font-size:13px">${level.desc}</div>
  </div>

  <h2 style="font-size:15px;margin:0 0 10px">Результаты по блокам</h2>
  <table style="margin-bottom:28px;background:#f8fafc;border-radius:8px;overflow:hidden">
    <thead><tr style="background:#e2e8f0">
      <th style="padding:8px 12px;text-align:left;font-size:13px">Блок</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px">Текущий</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px">Целевой</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px">Разрыв</th>
    </tr></thead>
    <tbody>${blockRows}</tbody>
  </table>

  <h2 style="font-size:15px;margin:0 0 10px;color:#6366f1">🤖 Экспертный анализ ИИ</h2>
  <div style="line-height:1.7">${aiHtml}</div>

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="padding:12px 28px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">
      🖨 Сохранить как PDF
    </button>
    <p style="color:#94a3b8;font-size:12px;margin-top:8px">В диалоге печати выберите «Сохранить как PDF»</p>
  </div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnostika-${(companyInfo.name||"rck").replace(/[^а-яa-z0-9]/gi,"-")}-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── КОМПОНЕНТЫ ──────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  const [info, setInfo] = useState({ name:"", industry:"", position:"", employees:"" });
  const set = (k,v) => setInfo(p => ({...p,[k]:v}));
  return (
    <div style={{ maxWidth:620, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:60, marginBottom:14 }}>🎯</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:800, color:"#f1f5f9", margin:"0 0 6px", lineHeight:1.2 }}>Чек-лист<br/>«Здоровье бизнеса»</h1>
        <p style={{ color:"#64748b", fontSize:14, margin:0 }}>Для собственников предприятий Ростовской области</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
        {[["📋","29 вопросов","5 блоков"],["⏱","10–15 минут","на заполнение"],["📊","1–4 балла","за ответ"],["🤖","ИИ-анализ","+ экспорт PDF"]].map(([e,t,s]) => (
          <div key={t} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:20, marginBottom:3 }}>{e}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{t}</div>
            <div style={{ fontSize:12, color:"#475569" }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:20, marginBottom:18 }}>
        <p style={{ color:"#64748b", fontSize:13, margin:"0 0 12px" }}>Расскажите о предприятии — поможет ИИ дать точные рекомендации</p>
        <div style={{ display:"grid", gap:10 }}>
          {[["name","Название предприятия","ООО «...»"],["industry","Отрасль","Производство, строительство..."],["position","Должность","Генеральный директор..."],["employees","Число сотрудников","50, 200..."]].map(([k,label,ph]) => (
            <div key={k}>
              <label style={{ display:"block", fontSize:12, color:"#475569", marginBottom:3 }}>{label}</label>
              <input value={info[k]} onChange={e => set(k,e.target.value)} placeholder={ph}
                style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:14, outline:"none", fontFamily:"Inter,sans-serif", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => onStart(info)}
        style={{ width:"100%", padding:"15px 0", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
        Начать диагностику →
      </button>
    </div>
  );
}

function QuestionBlock({ block, answers, onAnswer, onNext, onPrev, isFirst, isLast }) {
  const answered = block.questions.filter(q => answers[q.id]).length;
  const allDone = answered === block.questions.length;
  const COLORS = ["#ef4444","#f59e0b","#22c55e","#3b82f6"];
  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:26 }}>{block.emoji}</span>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#f1f5f9", margin:0 }}>Блок {block.id}: {block.title}</h2>
            <p style={{ fontSize:13, color:"#6366f1", margin:0, fontStyle:"italic" }}>{block.subtitle}</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(answered/block.questions.length)*100}%`, background:"linear-gradient(90deg,#6366f1,#a78bfa)", borderRadius:99, transition:"width 0.4s" }} />
          </div>
          <span style={{ fontSize:12, color:"#64748b" }}>{answered}/{block.questions.length}</span>
        </div>
      </div>
      <div style={{ display:"grid", gap:16 }}>
        {block.questions.map(q => (
          <div key={q.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${answers[q.id]?"rgba(99,102,241,0.35)":"rgba(255,255,255,0.07)"}`, borderRadius:12, padding:16, transition:"border-color 0.2s" }}>
            <div style={{ display:"flex", gap:9, marginBottom:12 }}>
              <span style={{ minWidth:26, height:26, background:answers[q.id]?"#6366f1":"rgba(255,255,255,0.07)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:answers[q.id]?"#fff":"#64748b", flexShrink:0, transition:"background 0.2s" }}>{q.id}</span>
              <p style={{ margin:0, fontSize:14, color:"#e2e8f0", lineHeight:1.5, fontWeight:500 }}>{q.text}</p>
            </div>
            <div style={{ display:"grid", gap:7 }}>
              {q.answers.map((ans,ai) => {
                const pts = ai+1, sel = answers[q.id]===pts;
                return (
                  <button key={ai} onClick={() => onAnswer(q.id,pts)}
                    style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 13px", background:sel?`${COLORS[ai]}18`:"rgba(255,255,255,0.02)", border:`1px solid ${sel?COLORS[ai]:"rgba(255,255,255,0.06)"}`, borderRadius:9, cursor:"pointer", color:sel?"#f1f5f9":"#94a3b8", fontSize:13, textAlign:"left", transition:"all 0.15s", lineHeight:1.4, fontFamily:"Inter,sans-serif" }}>
                    <span style={{ minWidth:20, height:20, borderRadius:5, background:sel?COLORS[ai]:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:sel?"#fff":"#64748b", flexShrink:0 }}>{pts}</span>
                    {ans}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, marginTop:22 }}>
        {!isFirst && <button onClick={onPrev} style={{ padding:"12px 18px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:10, color:"#64748b", fontSize:14, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>← Назад</button>}
        <button onClick={onNext} disabled={!allDone}
          style={{ flex:1, padding:"12px 0", background:allDone?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.04)", border:`1px solid ${allDone?"transparent":"rgba(255,255,255,0.07)"}`, borderRadius:10, color:allDone?"#fff":"#4b5563", fontSize:15, fontWeight:700, cursor:allDone?"pointer":"not-allowed", transition:"all 0.2s", fontFamily:"Inter,sans-serif" }}>
          {isLast?"Получить результаты 🎯":"Следующий блок →"}
        </button>
      </div>
    </div>
  );
}

function MarkdownText({ text }) {
  return (
    <div>
      {text.split("\n").map((line,i) => {
        if (line.startsWith("## ")) return <h3 key={i} style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:"#e2e8f0", margin:"16px 0 7px", borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:5 }}>{line.slice(3)}</h3>;
        if (line.match(/^[›•-]\s/) || line.match(/^\d+\.\s/)) return <div key={i} style={{ display:"flex", gap:7, marginBottom:5, color:"#cbd5e1", fontSize:13, lineHeight:1.6 }}><span style={{ color:"#6366f1", flexShrink:0 }}>›</span><span>{line.replace(/^[›•\-\d.]+\s*/,"").replace(/\*\*(.*?)\*\*/g,"$1")}</span></div>;
        if (line.trim()==="") return <div key={i} style={{ height:5 }} />;
        return <p key={i} style={{ margin:"3px 0", color:"#94a3b8", fontSize:13, lineHeight:1.6 }}>{line.replace(/\*\*(.*?)\*\*/g,"$1")}</p>;
      })}
    </div>
  );
}

function ResultsScreen({ companyInfo, blockScores, totalScore, aiText, loading, onExport }) {
  const level = getLevel(totalScore);
  const pct = Math.max(0,Math.min(100,((totalScore-20)/80)*100));
  const TARGET_SCORE = 16; // целевое состояние — уровень "Зрелый"

  // Радар: текущее + целевое состояние
  const radarData = BLOCKS.map(b => ({
    subject: b.title,
    Текущее: blockScores[b.id],
    Целевое: TARGET_SCORE,
    fullMark: 20
  }));

  return (
    <div style={{ maxWidth:720, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:6 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:"#f1f5f9", margin:0 }}>Результаты диагностики</h2>
        {companyInfo.name && <p style={{ color:"#6366f1", margin:"3px 0 0", fontSize:13 }}>{companyInfo.name}</p>}
      </div>

      {/* Шкала */}
      <div style={{ textAlign:"center", padding:"22px 0" }}>
        <div style={{ position:"relative", width:148, height:148, margin:"0 auto 10px" }}>
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"/>
            <circle cx="74" cy="74" r="60" fill="none" stroke={level.color} strokeWidth="12"
              strokeDasharray={`${2*Math.PI*60*pct/100} ${2*Math.PI*60}`}
              strokeLinecap="round" transform="rotate(-90 74 74)" style={{ transition:"stroke-dasharray 1.2s ease" }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:32, fontWeight:800, color:level.color, fontFamily:"'Playfair Display',serif" }}>{totalScore}</div>
            <div style={{ fontSize:11, color:"#64748b" }}>из 100</div>
          </div>
        </div>
        <div style={{ fontSize:17, fontWeight:700, color:level.color }}>{level.emoji} {level.label}</div>
        <div style={{ fontSize:13, color:"#94a3b8", marginTop:3 }}>{level.desc}</div>
      </div>

      {/* Блоки */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:18 }}>
        {BLOCKS.map(b => {
          const s = blockScores[b.id];
          const gap = TARGET_SCORE - s;
          const c = s<=8?"#ef4444":s<=12?"#f59e0b":s<=16?"#22c55e":"#3b82f6";
          return (
            <div key={b.id} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
              <div style={{ fontSize:15, marginBottom:2 }}>{b.emoji}</div>
              <div style={{ fontSize:18, fontWeight:800, color:c }}>{s}</div>
              <div style={{ fontSize:10, color:"#64748b", lineHeight:1.3 }}>{b.title}</div>
              <div style={{ marginTop:5, height:3, background:"rgba(255,255,255,0.06)", borderRadius:99 }}>
                <div style={{ height:"100%", width:`${(s/20)*100}%`, background:c, borderRadius:99 }}/>
              </div>
              {/* Разрыв до цели */}
              <div style={{ marginTop:4, fontSize:10, color:gap>0?"#ef4444":"#22c55e", fontWeight:600 }}>
                {gap>0?`−${gap} до цели`:"✅ цель"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Радар с двумя линиями */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"8px 0", height:230, marginBottom:18 }}>
        <div style={{ textAlign:"center", fontSize:11, color:"#64748b", marginBottom:-6 }}>
          Текущее vs Целевое состояние (16/20 — уровень «Зрелый»)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.07)"/>
            <PolarAngleAxis dataKey="subject" tick={{ fill:"#64748b", fontSize:10 }}/>
            <Tooltip contentStyle={{ background:"#1e293b", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, fontSize:12 }} formatter={(v,name) => [`${v}/20`, name]}/>
            <Legend wrapperStyle={{ fontSize:12, color:"#94a3b8", paddingTop:4 }}/>
            <Radar name="Текущее" dataKey="Текущее" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2}/>
            <Radar name="Целевое" dataKey="Целевое" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 3"/>
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ИИ-анализ */}
      <div style={{ background:"rgba(99,102,241,0.05)", border:"1px solid rgba(99,102,241,0.18)", borderRadius:12, padding:20, minHeight:120 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:17 }}>🤖</span>
            <h3 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:16, color:"#e2e8f0" }}>Экспертный анализ РЦК</h3>
            {loading && <span style={{ fontSize:11, color:"#6366f1", animation:"pulse 1.2s infinite" }}>генерирую...</span>}
          </div>
          {/* Кнопка экспорта — всегда видна на экране результатов */}
          <button onClick={onExport}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:aiText&&!loading?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.06)", border:`1px solid ${aiText&&!loading?"transparent":"rgba(255,255,255,0.1)"}`, borderRadius:8, color:aiText&&!loading?"#fff":"#64748b", fontSize:13, cursor:aiText&&!loading?"pointer":"default", fontFamily:"Inter,sans-serif", fontWeight:600, transition:"all 0.2s" }}>
            ⬇ Скачать PDF
          </button>
        </div>
        {loading && !aiText && (
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {[85,65,78,55,70].map((w,i) => (
              <div key={i} style={{ height:11, width:`${w}%`, background:"rgba(255,255,255,0.05)", borderRadius:5, animation:"pulse 1.4s infinite", animationDelay:`${i*0.12}s` }}/>
            ))}
          </div>
        )}
        {aiText && <MarkdownText text={aiText}/>}
        {!aiText && !loading && <p style={{ color:"#475569", fontSize:13, margin:0 }}>Анализ будет готов после завершения диагностики</p>}
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState({});
  const [answers, setAnswers] = useState({});
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const blockScores = BLOCKS.reduce((acc,b) => ({...acc,[b.id]:calcBlockScore(answers,b.id)}), {});
  const totalScore = Object.values(blockScores).reduce((a,b) => a+b, 0);
  const scrollTop = () => setTimeout(() => scrollRef.current?.scrollTo({top:0,behavior:"smooth"}), 80);

  const handleNext = async () => {
    if (step < 5) { setStep(s => s+1); scrollTop(); return; }
    setStep(6); scrollTop();
    setLoading(true); setAiText("");
    let finalText = "";
    try {
      const res = await fetch("/api/analyze", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ companyInfo, answers, blockScores, totalScore, blocks:BLOCKS }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value);
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data==="[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.text || parsed.token;
            if (parsed.error) { setAiText("Ошибка: "+parsed.error); break; }
            if (chunk) { finalText += chunk; setAiText(t => t+chunk); }
          } catch(_) {}
        }
      }
    } catch(e) { setAiText("Ошибка соединения: "+e.message); }
    setLoading(false);
    // Сохраняем в Google Sheets
    if (finalText) {
      fetch("/api/save", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ companyInfo, answers, blockScores, totalScore, aiAnalysis:finalText }),
      }).catch(()=>{});
    }
  };

  const handleExport = () => exportToPDF(companyInfo, blockScores, totalScore, aiText);

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"Inter,sans-serif", color:"#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.09);border-radius:3px}
      `}</style>
      <div style={{ background:"rgba(99,102,241,0.06)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"11px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:17 }}>🎯</span>
          <span style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>Здоровье бизнеса <span style={{ color:"#334155" }}>· РЦК</span></span>
        </div>
        {step>=1&&step<=5&&<div style={{ display:"flex", gap:5 }}>{BLOCKS.map(b=><div key={b.id} style={{ width:24, height:4, borderRadius:99, background:step>b.id?"#6366f1":step===b.id?"#818cf8":"rgba(255,255,255,0.08)", transition:"background 0.3s" }}/>)}</div>}
        {step===6&&<button onClick={()=>{setStep(0);setAnswers({});setAiText("");}} style={{ background:"none", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, color:"#64748b", fontSize:12, padding:"6px 12px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>↩ Пройти заново</button>}
      </div>
      <div ref={scrollRef} style={{ padding:"28px 16px 80px", maxHeight:"calc(100vh - 53px)", overflowY:"auto" }}>
        {step===0&&<WelcomeScreen onStart={info=>{setCompanyInfo(info);setStep(1);}}/>}
        {step>=1&&step<=5&&<QuestionBlock block={BLOCKS[step-1]} answers={answers} onAnswer={(qid,pts)=>setAnswers(p=>({...p,[qid]:pts}))} onNext={handleNext} onPrev={()=>{setStep(s=>s-1);scrollTop();}} isFirst={step===1} isLast={step===5}/>}
        {step===6&&<ResultsScreen companyInfo={companyInfo} blockScores={blockScores} totalScore={totalScore} aiText={aiText} loading={loading} onExport={handleExport}/>}
      </div>
    </div>
  );
}
