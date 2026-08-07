"use client";

import { useMemo, useState } from "react";

type UploadItem = { name: string; size: number; file: File };

type DaleTask = {
  id: string;
  title: string;
  contact_name?: string | null;
  company_name?: string | null;
  status: string;
  priority: string;
  created_at: string;
  due_at?: string | null;
  completed_at?: string | null;
  waiting_since?: string | null;
};

const fmt = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours} hr${mins ? ` ${mins} min` : ""}`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return `${days} day${days === 1 ? "" : "s"}${rem ? ` ${rem} hr` : ""}`;
};

export default function ContactIntakePage() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState("Ready.");
  const [drag, setDrag] = useState(false);
  const [tasks, setTasks] = useState<DaleTask[]>([]);
  const [showTasks, setShowTasks] = useState(false);

  const queue = useMemo(() => files.map((f) => `${f.name} · ${Math.max(1, Math.ceil(f.size / 1024))} KB`), [files]);

  const addFiles = (list: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(list).map((file) => ({ name: file.name, size: file.size, file }))]);
  };

  const pasteClipboard = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setPaste(value);
    } catch {
      setStatus("Paste directly into the email box.");
    }
  };

  const submit = async () => {
    if (!files.length && !paste.trim()) {
      setStatus("Add an email, file, or pasted content first.");
      return;
    }
    setStatus("Uploading and creating the contact intake record...");
    const form = new FormData();
    files.forEach(({ file }) => form.append("files", file));
    form.append("pasted_text", paste);
    try {
      const response = await fetch("/api/intake", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setStatus(`Saved intake ${data.intake_id}. Contact extraction, Dale tasks, and research are queued.`);
      setFiles([]);
      setPaste("");
    } catch (error) {
      setStatus(`Could not submit: ${error instanceof Error ? error.message : "Upload failed"}`);
    }
  };

  const taskTimer = (task: DaleTask) => {
    const now = Date.now();
    const created = Date.parse(task.created_at);
    const due = task.due_at ? Date.parse(task.due_at) : null;
    const done = task.completed_at ? Date.parse(task.completed_at) : null;
    const bits = [done ? `Completed in ${fmt(done - created)}` : `Open for ${fmt(now - created)}`];
    if (!done && due) bits.push(now > due ? `🔴 Overdue by ${fmt(now - due)}` : `Due in ${fmt(due - now)}`);
    if (!done && task.waiting_since) bits.push(`Waiting ${fmt(now - Date.parse(task.waiting_since))}`);
    return bits.join(" · ");
  };

  const loadTasks = async () => {
    setShowTasks(true);
    try {
      const response = await fetch("/api/tasks?status=ALL", { cache: "no-store" });
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch {
      setTasks([]);
    }
  };

  const updateTask = async (id: string, taskStatus: string) => {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: taskStatus }) });
    await loadTasks();
  };

  return (
    <main className="contact-shell">
      <style jsx>{`
        .contact-shell{min-height:100dvh;color:#fff;background:#071d31;overflow-x:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sky{min-height:100dvh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 75% 14%,rgba(255,255,255,.98) 0 8%,transparent 28%),radial-gradient(ellipse at 67% 32%,rgba(255,255,255,.9) 0 16%,transparent 42%),radial-gradient(ellipse at 86% 48%,rgba(255,255,255,.86) 0 17%,transparent 45%),radial-gradient(ellipse at 48% 56%,rgba(222,235,244,.78) 0 21%,transparent 49%),linear-gradient(180deg,#dfeaf2 0%,#b9cedc 41%,#6f899d 70%,#17364f 100%)}.nav{height:96px;padding:16px clamp(18px,5vw,72px);display:flex;align-items:center;justify-content:space-between;gap:24px;background:linear-gradient(180deg,rgba(245,249,252,.54),rgba(255,255,255,.05));backdrop-filter:blur(4px)}.brand{display:flex;align-items:center;gap:15px;color:#0a2944}.mark{font-size:clamp(38px,5vw,62px);font-weight:950;letter-spacing:-.12em;font-style:italic;line-height:.8}.wordmark{font-weight:850;font-size:clamp(12px,1.3vw,18px);line-height:1.05;letter-spacing:.05em}.navlinks{display:flex;gap:28px;color:#0a2944;font-weight:800;letter-spacing:.08em;font-size:13px}.join{border:1px solid #b78a3c;color:#8b641e;background:rgba(255,255,255,.38);padding:13px 22px;font-weight:850;letter-spacing:.07em}.content{flex:1;display:grid;grid-template-columns:minmax(0,.9fr) minmax(520px,1.1fr);gap:42px;align-items:center;padding:24px clamp(18px,5vw,72px) 64px}.copy{color:#082640;align-self:start;padding-top:44px;text-shadow:0 1px 0 rgba(255,255,255,.4)}.copy h1{font-size:clamp(50px,6.2vw,92px);line-height:.92;letter-spacing:-.055em;margin:0 0 24px;max-width:760px}.lead{font-size:clamp(21px,2.1vw,32px);line-height:1.3;margin:0 0 18px}.tag{font-weight:900;font-size:16px;margin-top:26px}.panel{background:linear-gradient(180deg,rgba(7,42,70,.97),rgba(3,24,43,.98));border:1px solid rgba(255,255,255,.2);box-shadow:0 32px 80px rgba(0,0,0,.35);border-radius:24px;padding:22px;backdrop-filter:blur(18px)}.drop{border:2px dashed rgba(255,255,255,.75);border-radius:18px;padding:31px;text-align:center;min-height:220px;display:grid;place-items:center;transition:.2s}.drop.active{border-color:#c99a43;background:rgba(201,154,67,.08)}.icon{font-size:54px;color:#c99a43;line-height:1}.drop h2{font-size:27px;margin:8px 0}.muted{color:#cedce7}.btnrow{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px}.btn{border:1px solid #c99a43;color:#fff;background:transparent;border-radius:8px;padding:12px 16px;font-weight:850;letter-spacing:.05em;min-height:45px}.primary{background:#c99a43;color:#10283d}.divider{display:flex;align-items:center;gap:14px;margin:17px 0;color:#dae5ed}.divider:before,.divider:after{content:"";height:1px;flex:1;background:rgba(255,255,255,.28)}textarea{width:100%;min-height:130px;background:rgba(0,15,29,.82);color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:14px;font:inherit;resize:vertical}.queue{display:grid;gap:8px;margin-top:12px}.item{padding:10px 12px;border-radius:9px;background:rgba(255,255,255,.08);font-size:14px}.timer{margin-top:14px;padding:12px;border:1px solid rgba(201,154,67,.45);border-radius:10px;color:#f0d89d}.actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}.status{margin-top:14px;padding:11px 12px;border-radius:9px;background:rgba(255,255,255,.08);color:#e8f0f6}.trust{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;background:rgba(3,21,38,.96);border-top:1px solid rgba(255,255,255,.12);padding:17px clamp(18px,5vw,72px)}.trust div{border-right:1px solid rgba(255,255,255,.18);padding-right:12px}.trust div:last-child{border-right:0}.trust b{display:block;font-size:13px;letter-spacing:.04em}.trust small{color:#bdcbd6}.taskButtons{display:flex;gap:8px;margin-top:8px}.taskButtons button{font-size:11px;padding:6px 9px;min-height:auto}@media(max-width:980px){.navlinks,.join{display:none}.content{grid-template-columns:1fr;gap:22px;padding-top:4px}.copy{padding-top:2px}.copy h1{font-size:clamp(48px,11vw,76px)}.panel{max-width:760px;width:100%}.trust{grid-template-columns:1fr 1fr}.trust div{border-right:0;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:8px}}@media(max-width:560px){.nav{height:76px;padding:12px 14px}.mark{font-size:42px}.wordmark{font-size:10px}.content{padding:6px 14px 26px}.copy h1{font-size:44px}.lead{font-size:19px}.panel{padding:14px;border-radius:16px}.drop{min-height:180px;padding:18px}.drop h2{font-size:21px}.btnrow .btn,.actions .btn{width:100%}.actions{flex-direction:column}.trust{grid-template-columns:1fr;padding:15px}.trust div{padding-bottom:7px}.sky{background:radial-gradient(ellipse at 74% 12%,rgba(255,255,255,.98) 0 10%,transparent 31%),radial-gradient(ellipse at 77% 35%,rgba(255,255,255,.88) 0 20%,transparent 48%),linear-gradient(180deg,#dfeaf2 0%,#aac2d2 42%,#6b879b 72%,#17364f 100%)}}
      `}</style>
      <section className="sky">
        <nav className="nav"><div className="brand"><div className="mark">SSX</div><div className="wordmark">BUILDING<br/>HUMAN POTENTIAL</div></div><div className="navlinks"><span>VISION</span><span>PEOPLE</span><span>COMMUNITY</span><span>IMPACT</span><span>ABOUT</span></div><button className="join">JOIN THE MOVEMENT</button></nav>
        <section className="content">
          <div className="copy"><h1>SSX Contact System<br/>Intake Center</h1><p className="lead">Drop, paste, and upload your emails.<br/>We’ll do the rest.</p><p className="tag">Turn email into action. Build better relationships.</p></div>
          <section className="panel">
            <div className={`drop ${drag ? "active" : ""}`} onDragEnter={(e)=>{e.preventDefault();setDrag(true)}} onDragOver={(e)=>{e.preventDefault();setDrag(true)}} onDragLeave={(e)=>{e.preventDefault();setDrag(false)}} onDrop={(e)=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}>
              <div><div className="icon">⇧</div><h2>Drag & Drop Email Files Here</h2><p className="muted">or tap to browse</p><p className="muted">Supports .msg, .eml, .pdf, images, spreadsheets, and attachments</p><div className="btnrow"><label className="btn primary">CHOOSE FILES<input hidden type="file" multiple accept=".msg,.eml,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,image/*" onChange={(e)=>e.target.files&&addFiles(e.target.files)}/></label><button className="btn" onClick={pasteClipboard}>PASTE FROM CLIPBOARD</button></div></div>
            </div>
            <div className="divider">OR</div>
            <label>Paste Email Content</label><textarea value={paste} onChange={(e)=>setPaste(e.target.value)} placeholder="Paste your email content here..."/>
            <div className="queue">{queue.map((q,i)=><div className="item" key={`${q}-${i}`}><b>{q}</b></div>)}{paste.trim()&&<div className="item"><b>Pasted email content</b> · {paste.trim().length} characters</div>}</div>
            <div className="timer">Dale task timers: Open for • Due in • Overdue by • Waiting since • Completed in</div>
            <button className="btn" style={{width:"100%",marginTop:12}} onClick={loadTasks}>VIEW DALE TASKS</button>
            {showTasks&&<div className="queue">{tasks.length?tasks.map((task)=><div className="item" key={task.id}><b>{task.title}</b><br/><span>{task.contact_name||task.company_name||"Unmatched contact"}</span><br/><small>{taskTimer(task)}</small><div className="taskButtons"><button className="btn" onClick={()=>updateTask(task.id,"COMPLETED")}>DONE</button><button className="btn" onClick={()=>updateTask(task.id,"WAITING")}>WAITING</button></div></div>):<div className="item">No Dale tasks yet.</div>}</div>}
            <div className="actions"><button className="btn" onClick={()=>{setFiles([]);setPaste("");setStatus("Cleared.")}}>CLEAR</button><button className="btn primary" onClick={submit}>SUBMIT FOR PROCESSING →</button></div>
            <div className="status">{status}</div>
          </section>
        </section>
        <footer className="trust"><div><b>BUILT ON TRUST</b><small>Verified. Vetted. Proven.</small></div><div><b>SECURE & RELIABLE</b><small>Enterprise-grade security.</small></div><div><b>REAL-TIME INSIGHT</b><small>Make better decisions faster.</small></div><div><b>ANYTIME, ANYWHERE</b><small>Phone, tablet, or desktop.</small></div><div><b>BUILT FOR RELATIONSHIPS</b><small>Because people build what matters.</small></div></footer>
      </section>
    </main>
  );
}
