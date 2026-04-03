import { useState, useRef, useCallback } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { BLOCKS as DEFAULT_BLOCKS, getLevel } from "./data.js";

const C = {
  bg:"#060A14", surf1:"#0C1422", surf2:"#111827",
  border:"rgba(255,255,255,0.07)", accent:"#4F6EF7", accentHover:"#6B84F8",
  cyan:"#06B6D4", green:"#10B981", yellow:"#F59E0B", red:"#EF4444",
  text1:"#F1F5F9", text2:"#94A3B8", text3:"#475569",
};

const DEFAULT_FIELDS = [
  { key:"name",     label:"Название предприятия", placeholder:"ООО «...»",              required:true,  type:"text" },
  { key:"industry", label:"Отрасль",              placeholder:"Выберите отрасль",        required:true,  type:"select",
    options:["Производство металлоконструкций","Производство оборудования","Пищевая промышленность","Деревообработка","Химическая промышленность","Строительство","Сельское хозяйство","Транспорт и логистика","Торговля","ИТ и телекоммуникации","Энергетика","Другое"] },
  { key:"position", label:"Должность",            placeholder:"Генеральный директор...", required:true,  type:"text" },
  { key:"employees",label:"Число сотрудников",    placeholder:"50, 200...",              required:false, type:"text" },
  { key:"phone",    label:"Телефон",              placeholder:"+7 (900) 000-00-00",      required:false, type:"text" },
  { key:"email",    label:"Email",                placeholder:"example@company.ru",      required:false, type:"text" },
];

const DEFAULT_CONTENT = {
  adminPassword: "rcк2025",
  managerEmail: "",
  followUpDays: 3,
  welcome: {
    title:"Чек-лист\n«Здоровье бизнеса»",
    subtitle:"Для собственников предприятий Ростовской области",
    formTitle:"Расскажите о предприятии — поможет ИИ дать точные рекомендации",
    ctaButton:"Начать диагностику",
    badges:[
      {label:"29 вопросов",sub:"5 блоков"},
      {label:"10–15 минут",sub:"на заполнение"},
      {label:"1–4 балла",sub:"за ответ"},
      {label:"ИИ-анализ",sub:"и экспорт PDF"},
    ],
    fields: DEFAULT_FIELDS,
  },
  results:{
    title:"Результаты диагностики",
    radarTitle:"Текущее vs Целевое состояние",
    aiTitle:"Экспертный анализ",
    exportButton:"Скачать PDF",
    restartButton:"Пройти заново",
  },
  blocks: DEFAULT_BLOCKS.map(b=>({
    id:b.id, title:b.title, subtitle:b.subtitle,
    questions:b.questions.map(q=>({id:q.id, text:q.text, answers:[...q.answers]})),
  })),
};

function useContent() {
  const [content, setContent] = useState(()=>{
    try { const s=localStorage.getItem("checklist_content"); return s?JSON.parse(s):DEFAULT_CONTENT; }
    catch { return DEFAULT_CONTENT; }
  });
  const save = useCallback(next=>{ setContent(next); localStorage.setItem("checklist_content",JSON.stringify(next)); },[]);
  const reset = useCallback(()=>{ localStorage.removeItem("checklist_content"); setContent(DEFAULT_CONTENT); },[]);
  return {content,save,reset};
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
function exportToPDF(companyInfo, blockScores, totalScore, aiText, content) {
  const level=getLevel(totalScore), TARGET=16;
  const fields = content.welcome.fields || DEFAULT_FIELDS;
  const infoRows = fields.map(f=>`<tr><td style="color:#64748b;padding:4px 16px 4px 0;width:160px">${f.label}</td><td style="font-weight:500">${companyInfo[f.key]||"—"}</td></tr>`).join("");
  const blockRows = content.blocks.map(b=>{
    const s=blockScores[b.id],gap=TARGET-s,c=s<=8?"#ef4444":s<=12?"#f59e0b":s<=16?"#22c55e":"#3b82f6";
    return `<tr><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9">${b.title}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${c}">${s}/20</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${TARGET}/20</td>
      <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;color:${gap>0?"#ef4444":"#22c55e"}">${gap>0?"−"+gap:"✓"}</td></tr>`;
  }).join("");
  const aiHtml=(aiText||"")
    .replace(/## (.*)/g,'<h3 style="color:#4F6EF7;font-size:14px;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">$1</h3>')
    .replace(/^[›•-] (.*)/gm,'<p style="margin:4px 0;padding-left:10px">• $1</p>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'<br>');
  const html=`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Диагностика — ${companyInfo.name||"РЦК"}</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto;font-size:14px}
  h1{color:#4F6EF7;margin:0 0 4px;font-size:22px}table{width:100%;border-collapse:collapse}
  @media print{.no-print{display:none}}</style></head><body>
  <h1>Чек-лист «Здоровье бизнеса» · РЦК</h1>
  <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">${new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</p>
  <table style="margin-bottom:20px">${infoRows}</table>
  <div style="background:#f8fafc;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
    <div style="font-size:52px;font-weight:800;color:#4F6EF7;line-height:1">${totalScore}</div>
    <div style="color:#94a3b8;font-size:12px">из 100 баллов</div>
    <div style="font-size:17px;font-weight:700;margin:6px 0">${level.emoji} ${level.label}</div>
  </div>
  <table style="margin-bottom:28px;background:#f8fafc;border-radius:8px">
    <thead><tr style="background:#e2e8f0"><th style="padding:8px 12px;text-align:left">Блок</th>
    <th style="padding:8px 12px;text-align:left">Текущий</th><th style="padding:8px 12px;text-align:left">Целевой</th>
    <th style="padding:8px 12px;text-align:left">Разрыв</th></tr></thead><tbody>${blockRows}</tbody></table>
  <h2 style="font-size:15px;color:#4F6EF7">Экспертный анализ</h2>
  <div style="line-height:1.7">${aiHtml}</div>
  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="padding:12px 28px;background:#4F6EF7;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">Сохранить как PDF</button>
  </div></body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`diagnostika-${(companyInfo.name||"rck").replace(/[^а-яa-z0-9]/gi,"-")}-${new Date().toISOString().slice(0,10)}.html`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// ─── ДИАЛОГ ПАРОЛЯ ───────────────────────────────────────────────────────────
function PasswordDialog({ onSuccess, onCancel, correctPassword }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const check = () => {
    if (pwd === correctPassword) { onSuccess(); }
    else { setError(true); setPwd(""); setTimeout(()=>setError(false),1500); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,padding:28,width:"100%",maxWidth:360}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:4,fontFamily:"Syne,sans-serif"}}>Настройки контента</div>
        <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Введите пароль администратора</div>
        <input
          type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&check()}
          placeholder="Пароль"
          autoFocus
          style={{width:"100%",background:C.surf2,border:`1px solid ${error?"#ef4444":C.border}`,borderRadius:8,padding:"10px 13px",color:C.text1,fontSize:14,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",marginBottom:error?4:12,transition:"border-color 0.2s"}}
        />
        {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12}}>Неверный пароль</div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px 0",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:13,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Отмена</button>
          <button onClick={check} style={{flex:1,padding:"10px 0",background:C.accent,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Войти</button>
        </div>
      </div>
    </div>
  );
}

// ─── АДМИН-ПАНЕЛЬ ─────────────────────────────────────────────────────────────
function AdminPanel({ content, onSave, onClose, onReset }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(content)));
  const [tab, setTab] = useState("welcome");
  const [activeBlock, setActiveBlock] = useState(0);

  const upd = (path,val) => {
    const next=JSON.parse(JSON.stringify(local));
    const keys=path.split(".");let obj=next;
    for(let i=0;i<keys.length-1;i++) obj=obj[keys[i]];
    obj[keys[keys.length-1]]=val; setLocal(next);
  };

  const fields = local.welcome.fields || DEFAULT_FIELDS;

  const updField = (fi, key, val) => {
    const next=JSON.parse(JSON.stringify(local));
    next.welcome.fields[fi][key]=val; setLocal(next);
  };

  const addField = () => {
    const next=JSON.parse(JSON.stringify(local));
    next.welcome.fields.push({key:`field_${Date.now()}`,label:"Новое поле",placeholder:"...",required:false});
    setLocal(next);
  };

  const removeField = (fi) => {
    const next=JSON.parse(JSON.stringify(local));
    next.welcome.fields.splice(fi,1); setLocal(next);
  };

  const updAnswer=(bi,qi,ai,val)=>{const n=JSON.parse(JSON.stringify(local));n.blocks[bi].questions[qi].answers[ai]=val;setLocal(n);};
  const addAnswer=(bi,qi)=>{const n=JSON.parse(JSON.stringify(local));n.blocks[bi].questions[qi].answers.push("Новый вариант");setLocal(n);};
  const removeAnswer=(bi,qi,ai)=>{const n=JSON.parse(JSON.stringify(local));if(n.blocks[bi].questions[qi].answers.length<=2)return;n.blocks[bi].questions[qi].answers.splice(ai,1);setLocal(n);};
  const addQuestion=(bi)=>{const n=JSON.parse(JSON.stringify(local));const b=n.blocks[bi];b.questions.push({id:`${b.id}.${b.questions.length+1}`,text:"Новый вопрос",answers:["Вариант 1","Вариант 2","Вариант 3","Вариант 4"]});setLocal(n);};
  const removeQuestion=(bi,qi)=>{const n=JSON.parse(JSON.stringify(local));if(n.blocks[bi].questions.length<=1)return;n.blocks[bi].questions.splice(qi,1);setLocal(n);};

  const inp=(val,onChange,multiline=false)=>{
    const s={width:"100%",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text1,fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",resize:"vertical"};
    return multiline?<textarea value={val} onChange={e=>onChange(e.target.value)} rows={2} style={s}/>:<input value={val} onChange={e=>onChange(e.target.value)} style={{...s,resize:undefined}}/>;
  };
  const lbl=(t)=><div style={{fontSize:11,color:C.text3,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{t}</div>;
  const sec=(t)=><div style={{fontSize:12,fontWeight:700,color:C.text2,margin:"18px 0 10px",paddingBottom:5,borderBottom:`1px solid ${C.border}`}}>{t}</div>;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:760,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.text1,fontFamily:"Syne,sans-serif"}}>Настройки контента</div>
            <div style={{fontSize:12,color:C.text3}}>Сохраняется в браузере</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{if(confirm("Сбросить все изменения?"))onReset();}} style={{padding:"6px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Сбросить</button>
            <button onClick={()=>onSave(local)} style={{padding:"6px 14px",background:C.accent,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Сохранить</button>
            <button onClick={onClose} style={{padding:"6px 12px",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:12,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>✕</button>
          </div>
        </div>

        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[["welcome","Приветствие"],["blocks","Вопросы"],["results","Результаты"],["security","Безопасность"]].map(([k,t])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:"9px 16px",background:"none",border:"none",borderBottom:`2px solid ${tab===k?C.accent:"transparent"}`,color:tab===k?C.text1:C.text3,fontSize:13,fontWeight:tab===k?600:400,cursor:"pointer",fontFamily:"DM Sans,sans-serif",transition:"all 0.15s"}}>{t}</button>
          ))}
        </div>

        <div style={{overflowY:"auto",padding:18,flex:1}}>

          {tab==="welcome"&&(
            <div style={{display:"grid",gap:12}}>
              {sec("Заголовок")}
              <div>{lbl("Главный заголовок (\\n = новая строка)")} {inp(local.welcome.title,v=>upd("welcome.title",v),true)}</div>
              <div>{lbl("Подзаголовок")} {inp(local.welcome.subtitle,v=>upd("welcome.subtitle",v))}</div>
              <div>{lbl("Текст над формой")} {inp(local.welcome.formTitle,v=>upd("welcome.formTitle",v))}</div>
              <div>{lbl("Текст кнопки")} {inp(local.welcome.ctaButton,v=>upd("welcome.ctaButton",v))}</div>

              {sec("Карточки-подсказки")}
              {local.welcome.badges.map((b,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>{lbl(`Карточка ${i+1} — заголовок`)} {inp(b.label,v=>{const n=JSON.parse(JSON.stringify(local));n.welcome.badges[i].label=v;setLocal(n);})}</div>
                  <div>{lbl("Подпись")} {inp(b.sub,v=>{const n=JSON.parse(JSON.stringify(local));n.welcome.badges[i].sub=v;setLocal(n);})}</div>
                </div>
              ))}

              {sec("Поля формы")}
              <div style={{fontSize:12,color:C.text3,marginTop:-8,marginBottom:4}}>Красная звёздочка = обязательное поле. Пользователь не сможет продолжить без его заполнения.</div>
              {fields.map((f,fi)=>(
                <div key={fi} style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:f.required?"#ef4444":C.text3}}>
                        <input type="checkbox" checked={f.required} onChange={e=>updField(fi,"required",e.target.checked)} style={{accentColor:"#ef4444"}}/>
                        Обязательное
                      </label>
                    </div>
                    {fields.length>1&&<button onClick={()=>removeField(fi)} style={{background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div>{lbl("Название поля")} {inp(f.label,v=>updField(fi,"label",v))}</div>
                    <div>{lbl("Подсказка / placeholder")} {inp(f.placeholder,v=>updField(fi,"placeholder",v))}</div>
                  </div>
                  <div style={{marginBottom: f.type==="select"?8:0}}>
                    {lbl("Тип поля")}
                    <select value={f.type||"text"} onChange={e=>updField(fi,"type",e.target.value)}
                      style={{width:"100%",background:C.surf1,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text1,fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",cursor:"pointer"}}>
                      <option value="text">Текстовое поле</option>
                      <option value="select">Выпадающий список</option>
                    </select>
                  </div>
                  {(f.type==="select")&&(
                    <div>
                      {lbl("Варианты списка (каждый с новой строки)")}
                      <textarea
                        value={(f.options||[]).join("\n")}
                        onChange={e=>updField(fi,"options",e.target.value.split("\n").filter(Boolean))}
                        rows={5}
                        style={{width:"100%",background:C.surf1,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text1,fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",resize:"vertical"}}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addField} style={{padding:"9px",background:"rgba(79,110,247,0.06)",border:`1px dashed ${C.accent}`,borderRadius:10,color:C.accent,fontSize:13,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>+ Добавить поле</button>
            </div>
          )}

          {tab==="blocks"&&(
            <div>
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {local.blocks.map((b,i)=>(
                  <button key={i} onClick={()=>setActiveBlock(i)} style={{padding:"5px 12px",background:activeBlock===i?C.accent:"rgba(255,255,255,0.04)",border:`1px solid ${activeBlock===i?C.accent:C.border}`,borderRadius:8,color:activeBlock===i?"#fff":C.text2,fontSize:12,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Блок {b.id}</button>
                ))}
              </div>
              {local.blocks[activeBlock]&&(()=>{
                const b=local.blocks[activeBlock],bi=activeBlock;
                return (
                  <div style={{display:"grid",gap:12}}>
                    {sec(`Блок ${b.id}: ${b.title}`)}
                    <div>{lbl("Название")} {inp(b.title,v=>{const n=JSON.parse(JSON.stringify(local));n.blocks[bi].title=v;setLocal(n);})}</div>
                    <div>{lbl("Подзаголовок")} {inp(b.subtitle,v=>{const n=JSON.parse(JSON.stringify(local));n.blocks[bi].subtitle=v;setLocal(n);},true)}</div>
                    {sec("Вопросы")}
                    {b.questions.map((q,qi)=>(
                      <div key={qi} style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:C.accent}}>Вопрос {q.id}</span>
                          {b.questions.length>1&&<button onClick={()=>removeQuestion(bi,qi)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,color:"#ef4444",fontSize:11,padding:"3px 8px",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>Удалить</button>}
                        </div>
                        <div style={{marginBottom:10}}>{lbl("Текст вопроса")} {inp(q.text,v=>{const n=JSON.parse(JSON.stringify(local));n.blocks[bi].questions[qi].text=v;setLocal(n);},true)}</div>
                        <div>{lbl(`Варианты ответов (${q.answers.length})`)}
                          <div style={{display:"grid",gap:5,marginTop:4}}>
                            {q.answers.map((ans,ai)=>(
                              <div key={ai} style={{display:"flex",gap:6,alignItems:"center"}}>
                                <span style={{minWidth:18,height:18,background:C.surf1,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.text3,flexShrink:0}}>{ai+1}</span>
                                <input value={ans} onChange={e=>updAnswer(bi,qi,ai,e.target.value)} style={{flex:1,background:C.surf1,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",color:C.text1,fontSize:13,outline:"none",fontFamily:"DM Sans,sans-serif"}}/>
                                {q.answers.length>2&&<button onClick={()=>removeAnswer(bi,qi,ai)} style={{background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>}
                              </div>
                            ))}
                            {q.answers.length<8&&<button onClick={()=>addAnswer(bi,qi)} style={{padding:"5px",background:"rgba(79,110,247,0.08)",border:`1px dashed ${C.accent}`,borderRadius:7,color:C.accent,fontSize:12,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>+ Добавить вариант</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={()=>addQuestion(bi)} style={{padding:"9px",background:"rgba(79,110,247,0.06)",border:`1px dashed ${C.accent}`,borderRadius:10,color:C.accent,fontSize:13,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>+ Добавить вопрос</button>
                  </div>
                );
              })()}
            </div>
          )}

          {tab==="results"&&(
            <div style={{display:"grid",gap:12}}>
              {sec("Страница результатов")}
              <div>{lbl("Заголовок")} {inp(local.results.title,v=>upd("results.title",v))}</div>
              <div>{lbl("Заголовок диаграммы")} {inp(local.results.radarTitle,v=>upd("results.radarTitle",v))}</div>
              <div>{lbl("Заголовок ИИ-анализа")} {inp(local.results.aiTitle,v=>upd("results.aiTitle",v))}</div>
              <div>{lbl("Кнопка экспорта")} {inp(local.results.exportButton,v=>upd("results.exportButton",v))}</div>
              <div>{lbl("Кнопка «заново»")} {inp(local.results.restartButton,v=>upd("results.restartButton",v))}</div>
            </div>
          )}

          {tab==="security"&&(
            <div style={{display:"grid",gap:12}}>
              {sec("Email менеджера")}
              <div style={{fontSize:12,color:C.text3,marginTop:-8}}>На этот адрес приходят уведомления о новых лидах и follow-up письма.</div>
              <div>{lbl("Email менеджера РЦК")} {inp(local.managerEmail||"",v=>upd("managerEmail",v))}</div>
              {sec("Follow-up письмо")}
              <div style={{fontSize:12,color:C.text3,marginTop:-8}}>Через сколько дней после анкеты отправлять развёрнутый анализ. Для теста поставьте 0.01 (~15 мин).</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,alignItems:"end"}}>
                <div>
                  {lbl("Дней до отправки")}
                  <input type="number" min="0" step="0.01" value={local.followUpDays??3} onChange={e=>upd("followUpDays",parseFloat(e.target.value)||0)}
                    style={{width:"100%",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text1,fontSize:14,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}/>
                </div>
                <div style={{fontSize:12,color:C.text3,paddingBottom:4}}>
                  {(local.followUpDays??3)===0?"Отправить при следующем запуске триггера":
                   (local.followUpDays??3)<1?`≈ ${Math.round((local.followUpDays??3)*24*60)} минут`:
                   `${local.followUpDays??3} ${(local.followUpDays??3)===1?"день":(local.followUpDays??3)<5?"дня":"дней"} после заполнения`}
                </div>
              </div>
              {sec("Пароль администратора")}
              <div style={{fontSize:12,color:C.text3,marginTop:-8}}>Запрашивается при каждом входе в это меню.</div>
              <div>{lbl("Новый пароль")} {inp(local.adminPassword||"",v=>upd("adminPassword",v))}</div>
              <div style={{background:"rgba(79,110,247,0.06)",border:`1px solid ${C.accent}33`,borderRadius:10,padding:14,fontSize:13,color:C.text2,lineHeight:1.6}}>
                Текущий пароль: <strong style={{color:C.text1}}>{local.adminPassword||"не задан"}</strong><br/>
                Не забудьте нажать <strong style={{color:C.accent}}>«Сохранить»</strong> после изменения.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ПРИВЕТСТВИЕ ──────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, content }) {
  const fields = content.welcome.fields || DEFAULT_FIELDS;
  const initInfo = Object.fromEntries(fields.map(f=>[f.key,""]));
  const [info, setInfo] = useState(initInfo);
  const [errors, setErrors] = useState({});

  const set = (k,v) => {
    setInfo(p=>({...p,[k]:v}));
    if (errors[k]) setErrors(p=>({...p,[k]:false}));
  };

  const handleStart = () => {
    const newErrors = {};
    fields.forEach(f=>{ if(f.required && !info[f.key]?.trim()) newErrors[f.key]=true; });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onStart(info);
  };

  const titleLines = content.welcome.title.split("\n");
  const requiredCount = fields.filter(f=>f.required).length;

  return (
    <div style={{maxWidth:580,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <h1 style={{fontFamily:"Syne,sans-serif",fontSize:"clamp(26px,4vw,38px)",fontWeight:800,color:C.text1,margin:"0 0 8px",lineHeight:1.15}}>
          {titleLines.map((l,i)=><span key={i}>{l}{i<titleLines.length-1&&<br/>}</span>)}
        </h1>
        <p style={{color:C.text3,fontSize:14,margin:0}}>{content.welcome.subtitle}</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        {content.welcome.badges.map((b,i)=>(
          <div key={i} style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:2}}>{b.label}</div>
            <div style={{fontSize:12,color:C.text3}}>{b.sub}</div>
          </div>
        ))}
      </div>

      <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
        <p style={{color:C.text3,fontSize:13,margin:"0 0 14px"}}>{content.welcome.formTitle}</p>
        <div style={{display:"grid",gap:10}}>
          {fields.map((f,fi)=>(
            <div key={f.key}>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:errors[f.key]?"#ef4444":C.text3,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                {f.label}
                {f.required&&<span style={{color:"#ef4444",fontSize:13,lineHeight:1}}>*</span>}
              </label>
              {f.type==="select" && f.options?.length ? (
                <select
                  value={info[f.key]||""}
                  onChange={e=>set(f.key,e.target.value)}
                  style={{width:"100%",background:C.surf2,border:`1px solid ${errors[f.key]?"#ef4444":C.border}`,borderRadius:8,padding:"10px 13px",color:info[f.key]?C.text1:C.text3,fontSize:14,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",cursor:"pointer",appearance:"auto"}}>
                  <option value="" style={{color:C.text3,background:C.surf2}}>{f.placeholder||"Выберите..."}</option>
                  {f.options.map((opt,oi)=><option key={oi} value={opt} style={{color:C.text1,background:C.surf2}}>{opt}</option>)}
                </select>
              ) : (
                <input
                  value={info[f.key]||""}
                  onChange={e=>set(f.key,e.target.value)}
                  placeholder={f.placeholder}
                  style={{width:"100%",background:C.surf2,border:`1px solid ${errors[f.key]?"#ef4444":C.border}`,borderRadius:8,padding:"10px 13px",color:C.text1,fontSize:14,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box",transition:"border-color 0.15s"}}
                  onFocus={e=>e.target.style.borderColor=errors[f.key]?"#ef4444":C.accent}
                  onBlur={e=>e.target.style.borderColor=errors[f.key]?"#ef4444":C.border}
                />
              )}
              {errors[f.key]&&<div style={{fontSize:11,color:"#ef4444",marginTop:3}}>Обязательное поле</div>}
            </div>
          ))}
        </div>
        {requiredCount>0&&<div style={{fontSize:11,color:C.text3,marginTop:12}}><span style={{color:"#ef4444"}}>*</span> — обязательные поля</div>}
      </div>

      <button onClick={handleStart}
        style={{width:"100%",padding:"14px 0",background:`linear-gradient(135deg,${C.accent},${C.accentHover})`,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"DM Sans,sans-serif",letterSpacing:"0.02em"}}>
        {content.welcome.ctaButton} →
      </button>
    </div>
  );
}

// ─── ВОПРОСЫ ─────────────────────────────────────────────────────────────────
function QuestionBlock({ block, answers, onAnswer, onNext, onPrev, isFirst, isLast, totalBlocks }) {
  const answered = block.questions.filter(q=>answers[q.id]).length;
  const allDone = answered===block.questions.length;
  const scoreColors=["#EF4444","#F59E0B","#22C55E","#3B82F6"];
  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:C.accent,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Блок {block.id} из {totalBlocks}</div>
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:20,color:C.text1,margin:0,fontWeight:700}}>{block.title}</h2>
        <p style={{fontSize:13,color:C.text3,margin:"2px 0 0",fontStyle:"italic"}}>{block.subtitle}</p>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
          <div style={{flex:1,height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(answered/block.questions.length)*100}%`,background:`linear-gradient(90deg,${C.accent},${C.cyan})`,borderRadius:99,transition:"width 0.4s"}}/>
          </div>
          <span style={{fontSize:11,color:C.text3,fontWeight:600}}>{answered}/{block.questions.length}</span>
        </div>
      </div>
      <div style={{display:"grid",gap:14}}>
        {block.questions.map(q=>(
          <div key={q.id} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${answers[q.id]?C.accent:'rgba(255,255,255,0.16)'}`,borderRadius:12,padding:16,transition:"border-color 0.2s"}}>
            <div style={{display:"flex",gap:9,marginBottom:12}}>
              <span style={{minWidth:24,height:24,background:answers[q.id]?C.accent:"rgba(255,255,255,0.06)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:answers[q.id]?"#fff":C.text3,flexShrink:0,transition:"background 0.2s"}}>{q.id}</span>
              <p style={{margin:0,fontSize:14,color:'#F1F5F9',lineHeight:1.55,fontWeight:600}}>{q.text}</p>
            </div>
            <div style={{display:"grid",gap:6}}>
              {q.answers.map((ans,ai)=>{
                const pts=ai+1,sel=answers[q.id]===pts;
                const c=scoreColors[Math.min(ai,scoreColors.length-1)];
                return (
                  <button key={ai} onClick={()=>onAnswer(q.id,pts)}
                    style={{display:"flex",alignItems:"center",gap:9,padding:"9px 13px",background:sel?`${c}22`:"rgba(255,255,255,0.09)",border:`1px solid ${sel?c:"rgba(255,255,255,0.25)"}`,borderRadius:9,cursor:"pointer",color:sel?'#fff':'#E2E8F0',fontSize:13,textAlign:"left",transition:"all 0.15s",lineHeight:1.4,fontFamily:"DM Sans,sans-serif"}}>
                    <span style={{minWidth:20,height:20,borderRadius:5,background:sel?c:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:sel?"#fff":"#CBD5E1",flexShrink:0}}>{pts}</span>
                    {ans}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}>
        {!isFirst&&<button onClick={onPrev} style={{padding:"12px 18px",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,color:C.text2,fontSize:14,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>← Назад</button>}
        <button onClick={onNext} disabled={!allDone}
          style={{flex:1,padding:"12px 0",background:allDone?`linear-gradient(135deg,${C.accent},${C.accentHover})`:"rgba(255,255,255,0.04)",border:`1px solid ${allDone?"transparent":C.border}`,borderRadius:10,color:allDone?"#fff":C.text3,fontSize:14,fontWeight:700,cursor:allDone?"pointer":"not-allowed",transition:"all 0.2s",fontFamily:"DM Sans,sans-serif"}}>
          {isLast?"Получить результаты":"Следующий блок →"}
        </button>
      </div>
    </div>
  );
}

// ─── РЕЗУЛЬТАТЫ ───────────────────────────────────────────────────────────────
function MdText({ text }) {
  return (
    <div>
      {text.split("\n").map((line,i)=>{
        if(line.startsWith("## ")) return <h3 key={i} style={{fontFamily:"Syne,sans-serif",fontSize:14,color:C.text1,margin:"16px 0 7px",borderBottom:`1px solid ${C.border}`,paddingBottom:5}}>{line.slice(3)}</h3>;
        if(line.match(/^[›•-]\s/)||line.match(/^\d+\.\s/)) return <div key={i} style={{display:"flex",gap:7,marginBottom:5,color:C.text2,fontSize:13,lineHeight:1.6}}><span style={{color:C.accent,flexShrink:0}}>›</span><span>{line.replace(/^[›•\-\d.]+\s*/,"").replace(/\*\*(.*?)\*\*/g,"$1")}</span></div>;
        if(line.trim()==="") return <div key={i} style={{height:5}}/>;
        return <p key={i} style={{margin:"3px 0",color:C.text3,fontSize:13,lineHeight:1.6}}>{line.replace(/\*\*(.*?)\*\*/g,"$1")}</p>;
      })}
    </div>
  );
}

function ResultsScreen({ companyInfo, blockScores, totalScore, aiText, loading, onExport, content }) {
  const level=getLevel(totalScore);
  const pct=Math.max(0,Math.min(100,((totalScore-20)/80)*100));
  const TARGET=16;
  const radarData=content.blocks.map(b=>({subject:b.title,Текущее:blockScores[b.id],Целевое:TARGET,fullMark:20}));
  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:6}}>
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:24,color:C.text1,margin:0,fontWeight:800}}>{content.results.title}</h2>
        {companyInfo.name&&<p style={{color:C.accent,margin:"3px 0 0",fontSize:13}}>{companyInfo.name}</p>}
      </div>
      <div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{position:"relative",width:148,height:148,margin:"0 auto 10px"}}>
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
            <circle cx="74" cy="74" r="60" fill="none" stroke={level.color} strokeWidth="10"
              strokeDasharray={`${2*Math.PI*60*pct/100} ${2*Math.PI*60}`}
              strokeLinecap="round" transform="rotate(-90 74 74)" style={{transition:"stroke-dasharray 1.2s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:34,fontWeight:800,color:level.color,fontFamily:"Syne,sans-serif"}}>{totalScore}</div>
            <div style={{fontSize:11,color:C.text3}}>из 100</div>
          </div>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:level.color,fontFamily:"Syne,sans-serif"}}>{level.emoji} {level.label}</div>
        <div style={{fontSize:13,color:C.text3,marginTop:3}}>{level.desc}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${content.blocks.length},1fr)`,gap:8,marginBottom:18}}>
        {content.blocks.map(b=>{
          const s=blockScores[b.id],gap=TARGET-s;
          const c=s<=8?C.red:s<=12?C.yellow:s<=16?C.green:C.cyan;
          return (
            <div key={b.id} style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"Syne,sans-serif"}}>{s}</div>
              <div style={{fontSize:10,color:C.text3,lineHeight:1.3,marginBottom:5}}>{b.title}</div>
              <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:99}}>
                <div style={{height:"100%",width:`${(s/20)*100}%`,background:c,borderRadius:99}}/>
              </div>
              <div style={{marginTop:4,fontSize:10,color:gap>0?C.red:C.green,fontWeight:600}}>{gap>0?`−${gap} до цели`:"✓ цель"}</div>
            </div>
          );
        })}
      </div>
      <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:"8px 0",height:220,marginBottom:18}}>
        <div style={{textAlign:"center",fontSize:11,color:C.text3,marginBottom:-6}}>{content.results.radarTitle} (16/20)</div>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{top:12,right:20,bottom:12,left:20}}>
            <PolarGrid stroke="rgba(255,255,255,0.06)"/>
            <PolarAngleAxis dataKey="subject" tick={{fill:C.text3,fontSize:10}}/>
            <Tooltip contentStyle={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} formatter={(v,n)=>[`${v}/20`,n]}/>
            <Legend wrapperStyle={{fontSize:12,color:C.text2,paddingTop:4}}/>
            <Radar name="Текущее" dataKey="Текущее" stroke={C.accent} fill={C.accent} fillOpacity={0.18} strokeWidth={2}/>
            <Radar name="Целевое" dataKey="Целевое" stroke={C.green} fill={C.green} fillOpacity={0.04} strokeWidth={2} strokeDasharray="5 3"/>
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:C.surf1,border:`1px solid ${C.border}`,borderRadius:12,padding:20,minHeight:120}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <h3 style={{fontFamily:"Syne,sans-serif",margin:0,fontSize:15,color:C.text1,fontWeight:700}}>{content.results.aiTitle}</h3>
            {loading&&<span style={{fontSize:11,color:C.accent,animation:"pulse 1.2s infinite"}}>генерирую...</span>}
          </div>
          <button onClick={onExport}
            style={{padding:"8px 16px",background:aiText&&!loading?C.accent:"rgba(255,255,255,0.05)",border:`1px solid ${aiText&&!loading?C.accent:C.border}`,borderRadius:8,color:aiText&&!loading?"#fff":C.text3,fontSize:12,cursor:aiText&&!loading?"pointer":"default",fontFamily:"DM Sans,sans-serif",fontWeight:600,transition:"all 0.2s"}}>
            ↓ {content.results.exportButton}
          </button>
        </div>
        {loading&&!aiText&&<div style={{display:"flex",flexDirection:"column",gap:7}}>{[85,65,78,55,70].map((w,i)=><div key={i} style={{height:10,width:`${w}%`,background:"rgba(255,255,255,0.05)",borderRadius:5,animation:"pulse 1.4s infinite",animationDelay:`${i*0.12}s`}}/>)}</div>}
        {aiText&&<MdText text={aiText}/>}
        {!aiText&&!loading&&<p style={{color:C.text3,fontSize:13,margin:0}}>Анализ будет готов после завершения диагностики</p>}
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function App() {
  const { content, save, reset } = useContent();
  const [step, setStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState({});
  const [answers, setAnswers] = useState({});
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPwdDialog, setShowPwdDialog] = useState(false);
  const scrollRef = useRef(null);

  const blockScores = content.blocks.reduce((acc,b)=>({...acc,[b.id]:b.questions.reduce((s,q)=>s+(answers[q.id]||0),0)}),{});
  const totalScore = Object.values(blockScores).reduce((a,b)=>a+b,0);
  const scrollTop = () => setTimeout(()=>scrollRef.current?.scrollTo({top:0,behavior:"smooth"}),80);

  const openAdmin = () => setShowPwdDialog(true);

  const handleNext = async () => {
    if (step < content.blocks.length) { setStep(s=>s+1); scrollTop(); return; }
    setStep(content.blocks.length+1); scrollTop();
    setLoading(true); setAiText("");
    let finalText="";
    try {
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({companyInfo,answers,blockScores,totalScore,blocks:content.blocks})});
      const reader=res.body.getReader(),decoder=new TextDecoder();
      let buf="";
      while(true){
        const{done,value}=await reader.read();if(done)break;
        buf+=decoder.decode(value);
        const lines=buf.split("\n");buf=lines.pop();
        for(const line of lines){
          if(!line.startsWith("data: "))continue;
          const data=line.slice(6);if(data==="[DONE]")continue;
          try{const p=JSON.parse(data),c=p.text||p.token;if(p.error){setAiText("Ошибка: "+p.error);break;}if(c){finalText+=c;setAiText(t=>t+c);}}catch(_){}
        }
      }
    }catch(e){setAiText("Ошибка: "+e.message);}
    setLoading(false);
    if(finalText){fetch("/api/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyInfo,answers,blockScores,totalScore,aiAnalysis:finalText,blocks:content.blocks,managerEmail:content.managerEmail||"",followUpDays:content.followUpDays??3})}).catch(()=>{});}
  };

  const resultsStep = content.blocks.length + 1;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"DM Sans,sans-serif",color:C.text1}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        input::placeholder,textarea::placeholder{color:${C.text3}}
      `}</style>

      {showPwdDialog&&<PasswordDialog
        correctPassword={content.adminPassword||"rcк2025"}
        onSuccess={()=>{setShowPwdDialog(false);setShowAdmin(true);}}
        onCancel={()=>setShowPwdDialog(false)}
      />}

      {showAdmin&&<AdminPanel content={content}
        onSave={c=>{save(c);setShowAdmin(false);}}
        onClose={()=>setShowAdmin(false)}
        onReset={()=>{reset();setShowAdmin(false);}}
      />}

      <div style={{background:`${C.surf1}cc`,borderBottom:`1px solid ${C.border}`,padding:"11px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,background:`linear-gradient(135deg,${C.accent},${C.cyan})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",fontFamily:"Syne,sans-serif",flexShrink:0}}>Б</div>
          <span style={{fontSize:13,fontWeight:600,color:C.text2,fontFamily:"Syne,sans-serif"}}>Здоровье бизнеса <span style={{color:C.text3,fontWeight:400}}>· РЦК</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {step>=1&&step<=content.blocks.length&&<div style={{display:"flex",gap:5}}>{content.blocks.map(b=><div key={b.id} style={{width:22,height:3,borderRadius:99,background:step>b.id?C.accent:step===b.id?`${C.accent}88`:"rgba(255,255,255,0.08)",transition:"background 0.3s"}}/>)}</div>}
          {step===resultsStep&&<button onClick={()=>{setStep(0);setAnswers({});setAiText("");}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.text3,fontSize:12,padding:"6px 12px",cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>{content.results.restartButton}</button>}
          <button onClick={openAdmin} title="Настройки" style={{width:32,height:32,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text3,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>⚙</button>
        </div>
      </div>

      <div ref={scrollRef} style={{padding:"32px 16px 80px",maxHeight:"calc(100vh - 53px)",overflowY:"auto"}}>
        {step===0&&<WelcomeScreen onStart={info=>{setCompanyInfo(info);setStep(1);}} content={content}/>}
        {step>=1&&step<=content.blocks.length&&
          <QuestionBlock
            block={content.blocks[step-1]}
            answers={answers}
            onAnswer={(qid,pts)=>setAnswers(p=>({...p,[qid]:pts}))}
            onNext={handleNext}
            onPrev={()=>{setStep(s=>s-1);scrollTop();}}
            isFirst={step===1}
            isLast={step===content.blocks.length}
            totalBlocks={content.blocks.length}
          />}
        {step===resultsStep&&
          <ResultsScreen companyInfo={companyInfo} blockScores={blockScores} totalScore={totalScore}
            aiText={aiText} loading={loading}
            onExport={()=>exportToPDF(companyInfo,blockScores,totalScore,aiText,content)}
            content={content}
          />}
      </div>
    </div>
  );
}
