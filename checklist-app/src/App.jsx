import { useState, useRef } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { BLOCKS, getLevel, calcBlockScore } from "./data.js";

function WelcomeScreen({ onStart }) {
  const [info, setInfo] = useState({ name: "", industry: "", position: "", employees: "" });
  const set = (k, v) => setInfo(p => ({ ...p, [k]: v }));
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.2 }}>
          Чек-лист<br />«Здоровье бизнеса»
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Для собственников предприятий Ростовской области</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {[["📋","29 вопросов","5 блоков по теме"],["⏱","10–15 минут","на заполнение"],["📊","1–4 балла","за каждый ответ"],["🎁","Сертификат","на экспресс-диагностику"]].map(([e,t,s]) => (
          <div key={t} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{e}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{t}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 14px" }}>Расскажите о себе — поможет ИИ дать точные рекомендации (необязательно)</p>
        <div style={{ display: "grid", gap: 10 }}>
          {[["name","Название предприятия","ООО «...»"],["industry","Отрасль / деятельность","Производство, строительство..."],["position","Должность","Генеральный директор, собственник..."],["employees","Число сотрудников","10, 50, 200..."]].map(([k,label,ph]) => (
            <div key={k}>
              <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>{label}</label>
              <input value={info[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, padding: "10px 13px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "Inter,sans-serif" }} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => onStart(info)}
        style={{ width: "100%", padding: "16px 0", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
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
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{block.emoji}</span>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#f1f5f9", margin: 0, fontWeight: 700 }}>Блок {block.id}: {block.title}</h2>
            <p style={{ fontSize: 13, color: "#6366f1", margin: 0, fontStyle: "italic" }}>{block.subtitle}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(answered/block.questions.length)*100}%`, background: "linear-gradient(90deg,#6366f1,#a78bfa)", borderRadius: 99, transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: 12, color: "#475569" }}>{answered}/{block.questions.length}</span>
        </div>
      </div>
      <div style={{ display: "grid", gap: 18 }}>
        {block.questions.map(q => (
          <div key={q.id} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${answers[q.id] ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, padding: 18, transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <span style={{ minWidth: 30, height: 30, background: answers[q.id] ? "#6366f1" : "rgba(255,255,255,0.07)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: answers[q.id] ? "#fff" : "#475569", transition: "background 0.2s", flexShrink: 0 }}>{q.id}</span>
              <p style={{ margin: 0, fontSize: 14, color: "#e2e8f0", lineHeight: 1.55, fontWeight: 500 }}>{q.text}</p>
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              {q.answers.map((ans, ai) => {
                const pts = ai + 1;
                const sel = answers[q.id] === pts;
                const col = COLORS[ai];
                return (
                  <button key={ai} onClick={() => onAnswer(q.id, pts)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: sel ? `${col}20` : "rgba(255,255,255,0.025)", border: `1px solid ${sel ? col : "rgba(255,255,255,0.05)"}`, borderRadius: 9, cursor: "pointer", color: sel ? "#f1f5f9" : "#94a3b8", fontSize: 13, textAlign: "left", transition: "all 0.15s", lineHeight: 1.4, fontFamily: "Inter,sans-serif" }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: 6, background: sel ? col : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: sel ? "#fff" : "#475569", flexShrink: 0 }}>{pts}</span>
                    {ans}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        {!isFirst && <button onClick={onPrev} style={{ padding: "14px 22px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "#94a3b8", fontSize: 14, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>← Назад</button>}
        <button onClick={onNext} disabled={!allDone}
          style={{ flex: 1, padding: "14px 0", background: allDone ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.04)", border: `1px solid ${allDone ? "transparent" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, color: allDone ? "#fff" : "#374151", fontSize: 15, fontWeight: 700, cursor: allDone ? "pointer" : "not-allowed", transition: "all 0.2s", fontFamily: "Inter,sans-serif" }}>
          {isLast ? "Получить результаты 🎯" : "Следующий блок →"}
        </button>
      </div>
    </div>
  );
}

function ResultsScreen({ companyInfo, blockScores, totalScore, aiText, loading }) {
  const level = getLevel(totalScore);
  const pct = Math.min(100, Math.max(0, ((totalScore - 20) / 80) * 100));
  const radarData = BLOCKS.map(b => ({ subject: b.title, score: blockScores[b.id], fullMark: 20 }));

  const renderMd = (text) => text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#e2e8f0", margin: "20px 0 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 5 }}>{line.slice(3)}</h3>;
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}><span style={{ color: "#6366f1", flexShrink: 0 }}>›</span><span>{line.replace(/^[-*\d.]+\s*/,"")}</span></div>;
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
    return <p key={i} style={{ margin: "3px 0", color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{line}</p>;
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#f1f5f9", margin: 0 }}>Результаты диагностики</h2>
        {companyInfo.name && <p style={{ color: "#6366f1", fontSize: 14, margin: "4px 0 0" }}>{companyInfo.name}</p>}
      </div>
      {/* Gauge */}
      <div style={{ textAlign: "center", padding: "28px 0 20px" }}>
        <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto 14px" }}>
          <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
            <circle cx="75" cy="75" r="60" fill="none" stroke={level.color} strokeWidth="13"
              strokeDasharray={`${2*Math.PI*60*pct/100} ${2*Math.PI*60}`}
              strokeLinecap="round" transform="rotate(-90 75 75)" style={{ transition: "stroke-dasharray 1.2s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: level.color, fontFamily: "'Playfair Display',serif" }}>{totalScore}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>из 100</div>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: level.color }}>{level.emoji} {level.label}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{level.desc}</div>
      </div>
      {/* Block scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 24 }}>
        {BLOCKS.map(b => {
          const s = blockScores[b.id];
          const c = s<=8?"#ef4444":s<=12?"#f59e0b":s<=16?"#22c55e":"#3b82f6";
          return (
            <div key={b.id} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{b.emoji}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c, margin: "4px 0 2px" }}>{s}</div>
              <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${(s/20)*100}%`, background: c, borderRadius: 99, transition: "width 1s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Radar */}
      <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 16, marginBottom: 22, height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}/20`,"Баллы"]} />
            <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.18} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* AI */}
      <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: 22, minHeight: 160 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h3 style={{ fontFamily: "'Playfair Display',serif", margin: 0, fontSize: 17, color: "#e2e8f0" }}>Экспертный анализ</h3>
          {loading && (
            <span style={{ fontSize: 12, color: "#6366f1", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #6366f1", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              анализирую...
            </span>
          )}
        </div>
        {loading && !aiText
          ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[85,70,90,65,75].map((w,i) => <div key={i} style={{ height: 11, width: `${w}%`, background: "rgba(255,255,255,0.04)", borderRadius: 6, animation: "pulse 1.5s infinite", animationDelay: `${i*0.12}s` }} />)}</div>
          : <div>{renderMd(aiText)}</div>
        }
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState({});
  const [answers, setAnswers] = useState({});
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const blockScores = BLOCKS.reduce((acc, b) => ({ ...acc, [b.id]: calcBlockScore(answers, b.id) }), {});
  const totalScore = Object.values(blockScores).reduce((a, b) => a + b, 0);
  const scrollTop = () => setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 80);

  const handleNext = async () => {
    if (step < 5) { setStep(s => s + 1); scrollTop(); return; }
    setStep(6); scrollTop();
    setLoading(true); setAiText("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyInfo, answers, blockScores, totalScore }),
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
          if (data === "[DONE]") continue;
          try {
            const { token, error } = JSON.parse(data);
            if (error) { setAiText("Ошибка: " + error); break; }
            if (token) setAiText(t => t + token);
          } catch (_) {}
        }
      }
    } catch (e) { setAiText("Ошибка соединения: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      <div style={{ background: "rgba(99,102,241,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>Здоровье бизнеса <span style={{ color: "#334155" }}>· РЦК</span></span>
        </div>
        {step >= 1 && step <= 5 && (
          <div style={{ display: "flex", gap: 5 }}>
            {BLOCKS.map(b => <div key={b.id} style={{ width: 26, height: 4, borderRadius: 99, background: step > b.id ? "#6366f1" : step === b.id ? "#818cf8" : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />)}
          </div>
        )}
        {step === 6 && <button onClick={() => { setStep(0); setAnswers({}); setAiText(""); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "6px 12px", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>↩ Пройти заново</button>}
      </div>
      <div ref={scrollRef} style={{ padding: "32px 16px 80px", maxHeight: "calc(100vh - 53px)", overflowY: "auto" }}>
        {step === 0 && <WelcomeScreen onStart={info => { setCompanyInfo(info); setStep(1); }} />}
        {step >= 1 && step <= 5 && <QuestionBlock block={BLOCKS[step-1]} answers={answers} onAnswer={(qid,pts) => setAnswers(p => ({...p,[qid]:pts}))} onNext={handleNext} onPrev={() => { setStep(s => s-1); scrollTop(); }} isFirst={step===1} isLast={step===5} />}
        {step === 6 && <ResultsScreen companyInfo={companyInfo} blockScores={blockScores} totalScore={totalScore} aiText={aiText} loading={loading} />}
      </div>
    </div>
  );
}
