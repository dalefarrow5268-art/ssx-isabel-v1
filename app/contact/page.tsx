"use client";

import { useRef, useState } from "react";

const CONTACT_API = (process.env.NEXT_PUBLIC_SSX_CONTACT_API || "https://ssx-contact-system.mason-forge-ssx.workers.dev").replace(/\/$/, "");

export default function Contact() {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const add = (items: FileList | null) => {
    if (items) setFiles((current) => [...current, ...Array.from(items)]);
  };

  async function submit() {
    if (!files.length && !text.trim()) {
      setStatus("Add an email or paste email content first.");
      return;
    }

    setStatus("Submitting for processing...");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("pasted_text", text);

    try {
      const response = await fetch(`${CONTACT_API}/api/intake`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Upload failed");
      setStatus("Submitted. Contact extraction and Dale tasks are queued.");
      setFiles([]);
      setText("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    }
  }

  return (
    <main className="page">
      <style jsx>{`
        * { box-sizing: border-box; }
        .page {
          --navy:#06233f;
          --gold:#d39a3a;
          --panel:rgba(2,30,54,.76);
          min-height:100svh;
          margin:0;
          color:var(--navy);
          font-family:Arial, Helvetica, sans-serif;
          background:#e6f0f8;
          overflow-x:hidden;
        }
        .stage {
          min-height:100svh;
          display:grid;
          grid-template-rows:auto minmax(0,1fr) auto;
          position:relative;
          isolation:isolate;
          overflow:hidden;
          background:
            linear-gradient(180deg,rgba(223,239,249,.04) 0%,rgba(255,255,255,.08) 41%,rgba(6,35,63,.22) 55%,rgba(3,29,52,.96) 72%,#031d34 87.5%,#e6f0f8 87.6%),
            url("/ssx-hero-clouds.jpg") center top / 100% 58.6% no-repeat,
            linear-gradient(180deg,#dcecf7 0%,#fff9ef 43%,#06233f 66%,#031d34 87.5%,#e6f0f8 87.6%);
        }
        .stage:before {
          content:"";
          position:absolute;
          left:0; right:0; bottom:12.4%;
          height:30%;
          z-index:-1;
          background:linear-gradient(180deg,rgba(5,35,63,0),rgba(3,29,52,.92) 36%,#031d34);
        }
        .nav {
          display:grid;
          grid-template-columns:360px 1fr 285px;
          align-items:start;
          gap:48px;
          padding:28px 56px 0;
        }
        .logo {
          font-size:132px;
          line-height:.68;
          letter-spacing:-13px;
          font-weight:900;
          color:var(--navy);
        }
        .logo span { color:rgba(6,35,63,.55); }
        .tag {
          margin-top:10px;
          display:flex;
          align-items:center;
          gap:10px;
          white-space:nowrap;
          font-size:12px;
          font-weight:900;
          letter-spacing:5px;
        }
        .tag:before,.tag:after,.footer-line:before,.footer-line:after {
          content:"";
          height:1px;
          background:var(--gold);
        }
        .tag:before,.tag:after { width:38px; }
        .links {
          display:flex;
          justify-content:center;
          gap:66px;
          padding-top:36px;
          font-size:15px;
          font-weight:900;
          letter-spacing:1.6px;
        }
        .join {
          justify-self:end;
          margin-top:26px;
          width:270px;
          height:46px;
          border:1px solid #b77e2d;
          background:rgba(255,255,255,.34);
          color:#a86d20;
          font-size:14px;
          font-weight:900;
          letter-spacing:2.5px;
        }
        .hero {
          min-height:0;
          position:relative;
          display:grid;
          grid-template-rows:auto 1fr;
          padding:34px 56px 0;
        }
        .copy {
          width:min(820px,52vw);
          max-width:none;
          position:relative;
          z-index:2;
        }
        h1 {
          margin:0;
          max-width:820px;
          font-size:clamp(58px,5vw,82px);
          line-height:.98;
          letter-spacing:-6px;
          font-weight:900;
          color:var(--navy);
        }
        .lead {
          margin:18px 0 0;
          font-size:clamp(22px,1.7vw,30px);
          line-height:1.24;
          color:#183956;
        }
        .rule {
          width:88px;
          height:2px;
          background:var(--gold);
          margin:20px 0 12px;
        }
        .promise {
          margin:0;
          font-size:15px;
          font-weight:900;
        }
        .plane {
          position:absolute;
          left:52.6%;
          top:12.5%;
          width:min(450px,30vw);
          height:120px;
          transform:rotate(-4deg);
          opacity:.9;
          filter:drop-shadow(0 12px 10px rgba(2,20,35,.18));
          pointer-events:none;
        }
        .plane svg { width:100%; height:100%; display:block; }
        .work {
          align-self:end;
          width:min(92vw,1418px);
          margin:36px auto 0;
          display:grid;
          grid-template-columns:minmax(300px,29%) minmax(520px,39%) minmax(330px,29%);
          gap:64px;
          align-items:end;
        }
        .panel {
          color:#fff;
          border:1px solid rgba(189,217,237,.17);
          border-radius:10px;
          background:var(--panel);
          box-shadow:0 22px 54px rgba(0,18,34,.22);
          backdrop-filter:blur(2px);
        }
        .left {
          min-height:238px;
          padding:24px 28px 24px 70px;
          position:relative;
        }
        .left:after {
          content:"";
          position:absolute;
          right:0;
          top:22px;
          bottom:22px;
          width:1px;
          background:rgba(211,226,238,.34);
        }
        .feat {
          display:grid;
          grid-template-columns:48px 1fr;
          gap:18px;
          margin-bottom:24px;
          align-items:start;
        }
        .feat:last-child { margin-bottom:0; }
        .ico {
          color:var(--gold);
          font-size:39px;
          line-height:1;
          text-align:center;
        }
        .feat b {
          display:block;
          margin-bottom:6px;
          font-size:13px;
        }
        .feat span {
          display:block;
          font-size:13px;
          line-height:1.42;
        }
        .drop {
          height:224px;
          border:2px dashed rgba(255,255,255,.94);
          border-radius:14px;
          background:rgba(2,30,54,.94);
          box-shadow:0 15px 36px rgba(0,16,31,.45), inset 0 0 24px rgba(255,255,255,.06);
          color:white;
          display:grid;
          place-items:center;
          text-align:center;
          cursor:pointer;
        }
        .upload {
          font-size:56px;
          line-height:1;
          color:var(--gold);
          margin-bottom:6px;
        }
        .drop strong {
          display:block;
          font-size:21px;
          margin-bottom:7px;
        }
        .drop small {
          display:block;
          font-size:13px;
          line-height:1.42;
          color:rgba(255,255,255,.92);
        }
        .browse { color:#e1a446; }
        .filelist,.status {
          color:#ffe1a8;
          font-size:12px;
          margin-top:7px;
        }
        .or {
          margin:14px 0 6px;
          display:flex;
          align-items:center;
          gap:18px;
          color:white;
          font-weight:900;
          letter-spacing:1px;
        }
        .or:before,.or:after {
          content:"";
          flex:1;
          height:1px;
          background:rgba(222,235,244,.62);
        }
        label {
          display:block;
          margin-bottom:6px;
          color:white;
          font-size:12px;
        }
        textarea {
          width:100%;
          height:76px;
          resize:none;
          border:1px solid rgba(176,204,224,.55);
          border-radius:5px;
          background:rgba(3,24,43,.85);
          color:white;
          padding:12px;
          font:inherit;
        }
        textarea::placeholder { color:rgba(255,255,255,.45); }
        .buttons {
          display:flex;
          justify-content:space-between;
          gap:16px;
          margin-top:8px;
        }
        .btn {
          height:34px;
          border:1px solid var(--gold);
          background:rgba(3,31,55,.55);
          color:#dca54b;
          padding:0 28px;
          font-size:12px;
          font-weight:900;
          letter-spacing:1.8px;
        }
        .submit { min-width:255px; }
        .right {
          min-height:238px;
          display:grid;
          grid-template-columns:142px 1fr;
          gap:28px;
          align-items:center;
          padding:24px 34px 24px 0;
          position:relative;
        }
        .right:before {
          content:"";
          position:absolute;
          left:0;
          top:22px;
          bottom:22px;
          width:1px;
          background:rgba(211,226,238,.34);
        }
        .mockcard {
          height:136px;
          border-radius:8px;
          background:linear-gradient(135deg,#f8fbff,#bac9d8);
          box-shadow:0 18px 30px rgba(0,0,0,.24);
          position:relative;
          overflow:hidden;
        }
        .mockcard:before {
          content:"SSX";
          position:absolute;
          top:10px; left:12px;
          font-size:10px;
          font-weight:900;
          color:var(--navy);
        }
        .mockcard:after {
          content:"";
          position:absolute;
          left:14px; right:14px; top:36px; bottom:14px;
          border-radius:4px;
          background:repeating-linear-gradient(180deg,rgba(11,49,82,.18) 0 8px,transparent 8px 18px);
        }
        .footer {
          min-height:12.4svh;
          padding:14px 56px 14px;
          background:rgba(231,240,247,.98);
        }
        .footer-line {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:16px;
          text-align:center;
          font-size:13px;
          font-weight:900;
          letter-spacing:2.6px;
        }
        .footer-line:before,.footer-line:after { flex:1; }
        .footrow {
          margin-top:22px;
          display:grid;
          grid-template-columns:1fr auto 1fr;
          align-items:end;
          gap:24px;
        }
        .footlogo {
          font-size:31px;
          font-weight:900;
          letter-spacing:-3px;
        }
        .footlogo span {
          margin-left:10px;
          font-size:11px;
          letter-spacing:2px;
          font-weight:800;
        }
        .footlinks {
          display:flex;
          gap:48px;
          font-size:12px;
          font-weight:900;
          letter-spacing:.9px;
        }
        .copyr { justify-self:end; font-size:12px; }

        @media (min-width:1181px) and (max-height:930px) {
          .stage { grid-template-rows:128px minmax(0,1fr) 100px; }
          .nav { padding-top:14px; }
          .logo { font-size:108px; letter-spacing:-11px; }
          .tag { margin-top:7px; font-size:11px; letter-spacing:4px; }
          .links { padding-top:30px; }
          .join { margin-top:22px; height:42px; }
          .hero { padding-top:22px; }
          h1 { font-size:clamp(54px,4.25vw,76px); }
          .lead { margin-top:12px; font-size:clamp(19px,1.35vw,25px); }
          .rule { margin-top:15px; margin-bottom:9px; }
          .promise { font-size:13px; }
          .plane { top:14%; width:min(400px,27vw); }
          .work { margin-top:24px; }
          .left,.right { min-height:190px; }
          .left { padding-top:18px; padding-bottom:18px; }
          .right { padding-top:18px; padding-bottom:18px; }
          .feat { margin-bottom:17px; }
          .ico { font-size:32px; }
          .feat b,.feat span { font-size:11.5px; }
          .drop { height:166px; }
          .upload { font-size:44px; }
          .drop strong { font-size:19px; }
          textarea { height:58px; }
          .mockcard { height:104px; }
          .footer { padding-top:10px; padding-bottom:10px; }
          .footrow { margin-top:16px; }
        }

        @media (max-width:1180px) {
          .stage {
            overflow:visible;
            background:
              linear-gradient(180deg,rgba(223,239,249,.04) 0%,rgba(255,255,255,.08) 38%,rgba(6,35,63,.22) 51%,rgba(3,29,52,.96) 65%,#031d34 88%,#e6f0f8 88.1%),
              url("/ssx-hero-clouds.jpg") 58% top / auto 58vh no-repeat,
              #031d34;
          }
          .nav { grid-template-columns:1fr auto; padding:22px 28px 0; }
          .links { display:none; }
          .hero { padding:34px 28px 0; }
          .copy { width:min(760px,78vw); }
          h1 { font-size:clamp(48px,7.2vw,72px); }
          .plane { width:34vw; left:60%; top:18%; }
          .work { grid-template-columns:1fr 1.35fr; gap:24px; margin:70px 28px 0; width:auto; }
          .right { grid-column:1/3; grid-template-columns:200px 1fr; padding-left:24px; }
        }

        @media (max-width:820px) {
          .stage {
            display:block;
            background:
              linear-gradient(180deg,rgba(230,241,249,.26) 0%,rgba(255,255,255,.05) 35%,rgba(3,29,52,.92) 56%,#031d34 88%,#e6f0f8 88.1%),
              url("/ssx-hero-clouds.jpg") 63% top / auto 54vh no-repeat,
              #031d34;
          }
          .nav { grid-template-columns:1fr; padding:18px 18px 0; }
          .logo { font-size:64px; letter-spacing:-7px; }
          .tag { font-size:9px; letter-spacing:2.7px; }
          .tag:before,.tag:after { width:28px; }
          .join,.plane { display:none; }
          .hero { padding:34px 18px 0; }
          .copy { width:100%; }
          h1 { font-size:clamp(39px,11.5vw,58px); letter-spacing:-3px; }
          .lead { font-size:20px; }
          .work { grid-template-columns:1fr; margin:44px 18px 0; gap:18px; }
          .left,.right { min-height:auto; padding:22px; }
          .left:after,.right:before { display:none; }
          .right { grid-column:auto; grid-template-columns:1fr; }
          .mockcard { display:none; }
          .buttons { flex-direction:column; }
          .btn,.submit { width:100%; min-width:0; }
          .footer { padding:18px; }
          .footrow { grid-template-columns:1fr; text-align:center; justify-items:center; }
          .footlogo span { display:block; margin:4px 0 0; }
          .footlinks { flex-wrap:wrap; justify-content:center; gap:28px; }
          .copyr { justify-self:center; }
        }
      `}</style>

      <div className="stage">
        <nav className="nav">
          <div>
            <div className="logo">SS<span>X</span></div>
            <div className="tag">BUILDING HUMAN POTENTIAL</div>
          </div>
          <div className="links"><span>VISION</span><span>PEOPLE</span><span>COMMUNITY</span><span>IMPACT</span><span>ABOUT</span></div>
          <button className="join">JOIN THE MOVEMENT</button>
        </nav>

        <section className="hero">
          <div className="copy">
            <h1>SSX Contact System<br />Intake Center</h1>
            <p className="lead">Drop, paste, and upload your emails.<br />We’ll do the rest.</p>
            <div className="rule" />
            <p className="promise">Turn email into action. Build better relationships.</p>
          </div>

          <div className="plane" aria-hidden="true">
            <svg viewBox="0 0 680 170">
              <defs>
                <linearGradient id="fuselage" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset=".45" stopColor="#d6e3ec" />
                  <stop offset=".52" stopColor="#06233f" />
                  <stop offset=".65" stopColor="#f6f9fb" />
                  <stop offset="1" stopColor="#748997" />
                </linearGradient>
                <linearGradient id="wing" x1="0" x2="1">
                  <stop offset="0" stopColor="#07233f" />
                  <stop offset=".5" stopColor="#0c76b1" />
                  <stop offset=".57" stopColor="#edf6fb" />
                  <stop offset="1" stopColor="#718595" />
                </linearGradient>
              </defs>
              <path d="M48 92 C168 48 520 45 641 77 C670 85 666 96 636 101 C493 128 168 130 48 92Z" fill="url(#fuselage)" />
              <path d="M78 86 L6 54 L110 61 L164 16 L218 16 L160 88Z" fill="url(#wing)" />
              <path d="M282 88 L416 158 L480 158 L362 91Z" fill="url(#wing)" />
              <path d="M340 72 L448 24 L512 25 L407 84Z" fill="url(#wing)" opacity=".94" />
              <path d="M70 88 C178 70 514 64 633 80" fill="none" stroke="#0a2a48" strokeWidth="3" opacity=".55" />
              {Array.from({ length: 18 }).map((_, index) => (
                <circle key={index} cx={250 + index * 18} cy={80 - index * .22} r="4.1" fill="#0b2b49" opacity=".75" />
              ))}
              <text x="322" y="105" fill="#092743" fontSize="25" fontWeight="900" letterSpacing="1">SSX</text>
            </svg>
          </div>

          <div className="work">
            <aside className="panel left">
              <div className="feat"><div className="ico">✉</div><div><b>DROP OR PASTE</b><span>Upload emails or paste<br />content in seconds</span></div></div>
              <div className="feat"><div className="ico">♙</div><div><b>SMART PROCESSING</b><span>We extract to-dos, contacts,<br />and key information</span></div></div>
              <div className="feat"><div className="ico">◷</div><div><b>STAY AHEAD</b><span>Organized insights. Urgent<br />alerts. Better results.</span></div></div>
            </aside>

            <section>
              <div className="drop" onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.files); }}>
                <div>
                  <div className="upload">⇧</div>
                  <strong>Drag &amp; Drop Email Files Here</strong>
                  <small>or <span className="browse">click to browse</span></small>
                  <small>Supports .msg, .eml, .pdf, .txt, and all file types<br />Max file size: 50 MB</small>
                </div>
              </div>
              <input ref={input} hidden type="file" multiple onChange={(event) => add(event.target.files)} />
              {files.length > 0 && <div className="filelist">{files.map((file, index) => <div key={`${file.name}-${index}`}>{file.name}</div>)}</div>}
              <div className="or">OR</div>
              <label>Paste Email Content</label>
              <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste your email content here..." />
              <div className="buttons">
                <button className="btn" onClick={() => { setFiles([]); setText(""); setStatus(""); }}>CLEAR</button>
                <button className="btn submit" onClick={submit}>SUBMIT FOR PROCESSING →</button>
              </div>
              {status && <div className="status">{status}</div>}
            </section>

            <aside className="panel right">
              <div className="mockcard" />
              <div>
                <div className="feat"><div className="ico">⌖</div><div><b>BUILT FOR DALE</b><span>Your tasks. Your priorities.<br />Your success.</span></div></div>
                <div className="feat"><div className="ico">⌑</div><div><b>SECURE &amp; RELIABLE</b><span>Enterprise-grade security<br />and cloud infrastructure</span></div></div>
                <div className="feat"><div className="ico">↗</div><div><b>MORE DONE, LESS NOISE</b><span>Focus on what matters.<br />We handle the rest.</span></div></div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-line">CONNECTING PEOPLE. ALIGNING PROJECTS. BUILDING TRUST.</div>
          <div className="footrow">
            <div className="footlogo">SSX <span>BUILDING HUMAN POTENTIAL</span></div>
            <div className="footlinks"><span>PRIVACY</span><span>TERMS</span><span>SUPPORT</span></div>
            <div className="copyr">© 2024 SSX Contact System</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
