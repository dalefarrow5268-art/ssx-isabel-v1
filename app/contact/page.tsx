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
          min-height: 100dvh;
          color: #061f3a;
          font-family: Arial, Helvetica, sans-serif;
          background:
            linear-gradient(180deg, rgba(236, 245, 251, .10) 0%, rgba(236, 245, 251, .02) 43%, rgba(3, 31, 55, .86) 61%, rgba(3, 31, 55, .97) 86%, rgba(226, 236, 245, .97) 86%),
            url('/ssx-hero-clouds.jpg') center top / 100% auto no-repeat,
            linear-gradient(180deg, #d9eaf5 0%, #f7f9f9 45%, #082946 64%, #05233d 86%, #e5eef6 86%);
          position: relative;
          overflow-x: hidden;
        }
        @media (min-width: 1181px) and (min-height: 760px) {
          .page {
            height: 100dvh;
            overflow: hidden;
          }
        }
        .page:after {
          content: '✈';
          position: fixed;
          top: clamp(175px, 22vh, 255px);
          left: 63%;
          transform: translateX(-50%) rotate(-6deg);
          color: rgba(5, 35, 62, .62);
          font-size: clamp(70px, 9vw, 145px);
          line-height: 1;
          pointer-events: none;
          text-shadow: 0 14px 28px rgba(255,255,255,.34);
          z-index: 0;
        }
        .shell {
          position: relative;
          z-index: 1;
        }
        .shell {
          height: 100dvh;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
        }
        .nav {
          display: grid;
          grid-template-columns: minmax(220px, 360px) 1fr auto;
          align-items: start;
          gap: clamp(22px, 4vw, 72px);
          padding: clamp(10px, 1.5vh, 18px) clamp(22px, 3.7vw, 68px) 0;
        }
        .brand {
          width: fit-content;
        }
        .wordmark {
          font-size: clamp(62px, 6.4vw, 116px);
          font-weight: 900;
          letter-spacing: clamp(-10px, -.8vw, -15px);
          line-height: .66;
          color: #06223e;
          text-shadow: 0 8px 22px rgba(255,255,255,.18);
        }
        .wordmark span {
          color: rgba(6,34,62,.58);
        }
        .tagline {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: clamp(6px, .8vh, 10px);
          font-size: clamp(10px, .72vw, 13px);
          font-weight: 800;
          letter-spacing: clamp(4px, .55vw, 8px);
          white-space: nowrap;
        }
        .tagline:before,
        .tagline:after {
          content: '';
          width: 42px;
          height: 1px;
          background: #c99034;
        }
        .links {
          display: flex;
          justify-content: center;
          gap: clamp(28px, 4.5vw, 84px);
          padding-top: clamp(14px, 2vh, 24px);
          font-size: clamp(12px, .9vw, 16px);
          font-weight: 900;
          letter-spacing: 1.8px;
        }
        .join {
          margin-top: clamp(14px, 2vh, 22px);
          min-width: clamp(210px, 17vw, 290px);
          border: 1px solid #b98330;
          background: rgba(255,255,255,.43);
          color: #a86e20;
          padding: clamp(10px, 1.4vh, 14px) 26px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 2.4px;
        }
        .hero {
          display: grid;
          grid-template-columns: minmax(250px, 28vw) minmax(420px, 1fr) minmax(260px, 30vw);
          grid-template-rows: auto 1fr;
          column-gap: clamp(28px, 4vw, 74px);
          padding: clamp(8px, 1.5vh, 16px) clamp(22px, 3.7vw, 68px) clamp(6px, 1vh, 10px);
        }
        .copy {
          grid-column: 1 / 3;
          max-width: 760px;
        }
        h1 {
          margin: 0;
          font-size: clamp(42px, 4.5vw, 72px);
          line-height: .98;
          letter-spacing: clamp(-4px, -.35vw, -7px);
          color: #06223e;
        }
        .lead {
          margin: clamp(10px, 1.7vh, 18px) 0 0;
          font-size: clamp(16px, 1.25vw, 22px);
          line-height: 1.28;
          color: #153555;
        }
        .goldline {
          width: 92px;
          height: 2px;
          background: #c99034;
          margin: clamp(10px, 1.8vh, 20px) 0 clamp(8px, 1.2vh, 12px);
        }
        .promise {
          margin: 0;
          font-size: clamp(13px, .9vw, 16px);
          font-weight: 800;
        }
        .lower {
          grid-column: 1 / 4;
          align-self: end;
          display: grid;
          grid-template-columns: minmax(250px, 360px) minmax(420px, 680px) minmax(260px, 430px);
          justify-content: space-between;
          align-items: end;
          gap: clamp(22px, 4vw, 64px);
          margin-top: clamp(14px, 3.2vh, 34px);
        }
        .side-card,
        .right-card {
          min-height: clamp(150px, 19vh, 190px);
          border-radius: 14px;
          background: rgba(2, 31, 56, .62);
          border: 1px solid rgba(186, 213, 230, .16);
          box-shadow: 0 24px 54px rgba(0, 20, 39, .23);
          backdrop-filter: blur(4px);
        }
        .side-card {
          padding: clamp(12px, 1.8vh, 18px) 22px clamp(12px, 1.8vh, 18px) 38px;
        }
        .feature {
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 18px;
          color: white;
          margin-bottom: clamp(10px, 1.5vh, 16px);
        }
        .feature:last-child { margin-bottom: 0; }
        .icon {
          color: #d49a38;
          font-size: 42px;
          line-height: 1;
          text-align: center;
        }
        .feature b {
          display: block;
          font-size: 13px;
          letter-spacing: .4px;
          margin-bottom: 7px;
        }
        .feature span {
          display: block;
          font-size: 13px;
          line-height: 1.45;
        }
        .intake {
          color: white;
        }
        .drop {
          height: clamp(130px, 17vh, 165px);
          border: 2px dashed rgba(255,255,255,.92);
          border-radius: 14px;
          background: rgba(2, 31, 56, .95);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          box-shadow: 0 13px 32px rgba(0, 16, 31, .5), inset 0 0 24px rgba(255,255,255,.06);
        }
        .upload {
          color: #d49a38;
          font-size: clamp(42px, 5.5vh, 56px);
          line-height: 1;
          margin-bottom: 5px;
        }
        .drop strong {
          display: block;
          font-size: clamp(18px, 1.35vw, 22px);
          margin-bottom: 8px;
        }
        .drop small {
          display: block;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255,255,255,.92);
        }
        .browse { color: #dfa747; }
        .or {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: clamp(7px, 1.1vh, 10px) 0 5px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .or:before,
        .or:after {
          content: '';
          height: 1px;
          flex: 1;
          background: rgba(223, 233, 241, .6);
        }
        label {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
        }
        textarea {
          width: 100%;
          height: clamp(44px, 6vh, 58px);
          resize: none;
          color: white;
          background: rgba(3, 23, 43, .82);
          border: 1px solid rgba(172, 199, 220, .55);
          border-radius: 6px;
          padding: 14px;
          font: inherit;
        }
        textarea::placeholder { color: rgba(255,255,255,.46); }
        .buttons {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          margin-top: 10px;
        }
        .btn {
          height: 32px;
          border: 1px solid #c99034;
          background: rgba(3, 31, 55, .54);
          color: #d8a24b;
          padding: 0 28px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }
        .submit { min-width: 260px; }
        .status,
        .filelist {
          margin-top: 8px;
          color: #ffe1a9;
          font-size: 12px;
          line-height: 1.35;
        }
        .right-card {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 24px;
          align-items: center;
          padding: 24px 26px 24px 0;
        }
        .preview {
          height: clamp(86px, 12vh, 112px);
          border-radius: 9px;
          background: linear-gradient(135deg, #f8fbff, #b8c7d6);
          margin-left: 0;
          box-shadow: 0 18px 30px rgba(0,0,0,.24);
          position: relative;
          overflow: hidden;
        }
        .preview:before {
          content: 'SSX';
          position: absolute;
          top: 10px;
          left: 12px;
          color: #082642;
          font-size: 10px;
          font-weight: 900;
        }
        .preview:after {
          content: '';
          position: absolute;
          inset: 34px 14px 14px;
          border-radius: 6px;
          background:
            repeating-linear-gradient(180deg, rgba(10,45,77,.18) 0 8px, transparent 8px 18px),
            linear-gradient(90deg, rgba(9,44,77,.18), transparent 48%);
        }
        .right-features .feature {
          grid-template-columns: 46px 1fr;
          margin-bottom: clamp(12px, 2.1vh, 22px);
        }
        .footer {
          background: rgba(229, 238, 246, .96);
          min-height: clamp(74px, 10vh, 92px);
          padding: clamp(8px, 1vh, 10px) clamp(22px, 4vw, 74px) clamp(8px, 1vh, 10px);
          color: #06223e;
        }
        .footer-line {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 3px;
          text-align: center;
        }
        .footer-line:before,
        .footer-line:after {
          content: '';
          height: 1px;
          flex: 1;
          background: #c99034;
        }
        .footer-bottom {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 22px;
          margin-top: clamp(8px, 1.2vh, 12px);
        }
        .footer-brand {
          font-size: 31px;
          font-weight: 900;
          letter-spacing: -3px;
        }
        .footer-brand span {
          margin-left: 8px;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
        }
        .footer-links {
          display: flex;
          gap: 52px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .copyright {
          justify-self: end;
          font-size: 12px;
        }

        @media (min-width: 1181px) and (max-height: 930px) {
          .wordmark { font-size: clamp(58px, 5.8vw, 104px); }
          .tagline { margin-top: 5px; }
          .links { padding-top: 14px; }
          .join { margin-top: 8px; }
          .hero { padding-top: 6px; }
          h1 { font-size: clamp(38px, 4vw, 64px); }
          .lead { margin-top: 7px; font-size: clamp(15px, 1.12vw, 20px); }
          .goldline { margin-top: 8px; margin-bottom: 6px; }
          .lower { margin-top: clamp(8px, 2vh, 18px); }
          .side-card,
          .right-card { min-height: 150px; }
          .feature { margin-bottom: 10px; }
          .icon { font-size: 34px; }
          .feature b,
          .feature span { font-size: 11px; }
          .drop { height: 124px; }
          .upload { font-size: 34px; }
          .drop strong { margin-bottom: 3px; }
          .drop small { font-size: 11px; line-height: 1.25; }
          .or { margin: 5px 0 3px; }
          label { margin-bottom: 4px; font-size: 11px; }
          textarea { height: 42px; padding: 9px 12px; }
          .buttons { margin-top: 6px; }
          .btn { height: 28px; }
          .preview { height: 82px; }
          .right-features .feature { margin-bottom: 9px; }
          .footer-line { font-size: 10px; letter-spacing: 2px; }
          .footer-brand { font-size: 24px; }
          .footer-links { gap: 34px; }
          .copyright { font-size: 11px; }
        }

        @media (min-width: 1181px) {
          .page {
            height: 100dvh;
            min-height: 100dvh;
            overflow: hidden;
            background: #e5eef6;
          }
          .page:after { display: none; }
          .shell {
            position: relative;
            height: 100dvh;
            min-height: 0;
            display: block;
            background: url('/ssx-contact-original.jpg') center center / contain no-repeat;
          }
          .nav,
          .copy,
          .side-card,
          .right-card,
          .footer {
            opacity: 0;
            pointer-events: none;
          }
          .hero {
            position: absolute;
            inset: 0;
            display: block;
            padding: 0;
          }
          .lower {
            position: absolute;
            inset: 0;
            display: block;
            margin: 0;
          }
          .intake {
            position: absolute;
            left: 32.3%;
            top: 48.6%;
            width: 35.5%;
            height: 38.5%;
            color: transparent;
          }
          .drop {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 48%;
            opacity: 0;
          }
          .or,
          label,
          .filelist,
          .status {
            opacity: 0;
          }
          textarea {
            position: absolute;
            left: 0;
            top: 63.5%;
            width: 100%;
            height: 16%;
            opacity: 0;
          }
          .buttons {
            position: absolute;
            left: 0;
            top: 82%;
            width: 100%;
            height: 10%;
            margin: 0;
            display: grid;
            grid-template-columns: 15% 1fr 42%;
            gap: 0;
          }
          .btn {
            opacity: 0;
            width: 100%;
            height: 100%;
            padding: 0;
          }
          .submit {
            grid-column: 3;
            min-width: 0;
          }
          .buttons .btn:first-child {
            grid-column: 1;
          }
        }
        @media (max-width: 1180px) {
          .nav { grid-template-columns: 1fr auto; }
          .links { display: none; }
          .hero { grid-template-columns: 1fr; }
          .copy { grid-column: auto; }
          .lower {
            grid-column: auto;
            grid-template-columns: 1fr 1.35fr;
            margin-top: clamp(54px, 10vh, 120px);
          }
          .right-card { grid-column: 1 / 3; grid-template-columns: 220px 1fr; padding-left: 24px; }
        }
        @media (max-width: 820px) {
          .page {
            height: auto;
            min-height: 100dvh;
            background:
              linear-gradient(180deg, rgba(231,241,249,.36) 0%, rgba(231,241,249,.08) 38%, rgba(3,31,55,.94) 58%, rgba(3,31,55,.98) 88%, rgba(226,236,245,.97) 88%),
              url('/ssx-hero-clouds.jpg') 64% top / auto 56vh no-repeat,
              #06223e;
          }
          .page:after {
            top: 245px;
            left: 70%;
            font-size: 86px;
            opacity: .48;
          }
          .nav { grid-template-columns: 1fr; gap: 12px; }
          .join { display: none; }
          .tagline:before, .tagline:after { width: 28px; }
          .hero { padding-top: 34px; }
          .copy { max-width: 100%; }
          .lower { grid-template-columns: 1fr; gap: 18px; margin-top: 44px; }
          .side-card, .right-card { min-height: auto; }
          .side-card { padding: 22px; }
          .right-card { grid-column: auto; grid-template-columns: 1fr; padding: 22px; }
          .preview { display: none; }
          .feature { margin-bottom: 20px; }
          .buttons { flex-direction: column; }
          .btn, .submit { width: 100%; min-width: 0; }
          .footer-bottom { grid-template-columns: 1fr; text-align: center; justify-items: center; }
          .copyright { justify-self: center; }
          .footer-links { gap: 28px; flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 520px) {
          .nav, .hero, .footer { padding-left: 16px; padding-right: 16px; }
          .wordmark { font-size: 64px; letter-spacing: -7px; }
          .tagline { font-size: 9px; letter-spacing: 2.8px; }
          h1 { font-size: clamp(41px, 12vw, 56px); letter-spacing: -3px; }
          .lead { font-size: 20px; }
          .drop { height: 210px; padding: 18px; }
          .upload { font-size: 48px; }
          .footer-line { font-size: 10px; letter-spacing: 1.7px; }
          .footer-brand span { display: block; margin: 4px 0 0; }
        }
      `}</style>
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <div className="wordmark">SS<span>X</span></div>
            <div className="tagline">BUILDING HUMAN POTENTIAL</div>
          </div>
          <div className="links"><span>VISION</span><span>PEOPLE</span><span>COMMUNITY</span><span>IMPACT</span><span>ABOUT</span></div>
          <button className="join">JOIN THE MOVEMENT</button>
        </nav>

        <section className="hero">
          <div className="copy">
            <h1>SSX Contact System<br />Intake Center</h1>
            <p className="lead">Drop, paste, and upload your emails.<br />We’ll do the rest.</p>
            <div className="goldline" />
            <p className="promise">Turn email into action. Build better relationships.</p>
          </div>

          <div className="lower">
            <aside className="side-card">
              <div className="feature"><div className="icon">✉</div><div><b>DROP OR PASTE</b><span>Upload emails or paste<br />content in seconds</span></div></div>
              <div className="feature"><div className="icon">♙</div><div><b>SMART PROCESSING</b><span>We extract to-dos, contacts,<br />and key information</span></div></div>
              <div className="feature"><div className="icon">◷</div><div><b>STAY AHEAD</b><span>Organized insights. Urgent<br />alerts. Better results.</span></div></div>
            </aside>

            <section className="intake">
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

            <aside className="right-card">
              <div className="preview" />
              <div className="right-features">
                <div className="feature"><div className="icon">⌖</div><div><b>BUILT FOR DALE</b><span>Your tasks. Your priorities.<br />Your success.</span></div></div>
                <div className="feature"><div className="icon">⌑</div><div><b>SECURE &amp; RELIABLE</b><span>Enterprise-grade security<br />and cloud infrastructure</span></div></div>
                <div className="feature"><div className="icon">↗</div><div><b>MORE DONE, LESS NOISE</b><span>Focus on what matters.<br />We handle the rest.</span></div></div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-line">CONNECTING PEOPLE. ALIGNING PROJECTS. BUILDING TRUST.</div>
          <div className="footer-bottom">
            <div className="footer-brand">SSX <span>BUILDING HUMAN POTENTIAL</span></div>
            <div className="footer-links"><span>PRIVACY</span><span>TERMS</span><span>SUPPORT</span></div>
            <div className="copyright">© 2024 SSX Contact System</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
