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
          --navy: #06223e;
          --ink: #061f3a;
          --gold: #d49a38;
          --panel: rgba(2, 30, 54, .76);
          min-height: 100dvh;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
          background: #e5eef6;
          overflow-x: hidden;
          display: grid;
          place-items: start center;
        }
        .stage {
          width: min(100vw, 1536px, calc(100dvh * 1.5));
          height: min(100dvh, 1024px, calc(100vw / 1.5));
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          container-type: size;
          background:
            linear-gradient(180deg, rgba(234,244,251,.05) 0%, rgba(255,255,255,.06) 43%, rgba(3,31,55,.80) 61%, rgba(3,31,55,.98) 86%, rgba(229,238,246,.98) 86%),
            url('/ssx-hero-clouds.jpg') center top / 100% 58% no-repeat,
            linear-gradient(180deg, #dcebf5 0%, #f8fafb 43%, #06223e 63%, #041f38 86%, #e5eef6 86%);
        }
        .stage:before {
          content: "";
          position: absolute;
          inset: 54% 0 13%;
          z-index: -1;
          background: linear-gradient(180deg, rgba(4,31,55,.18), rgba(2,24,43,.98) 28%, rgba(2,24,43,.98));
        }
        .nav {
          display: grid;
          grid-template-columns: minmax(210px, 330px) 1fr auto;
          align-items: start;
          gap: clamp(24px, 4vw, 74px);
          padding: min(2.9%, 30px) min(3.7%, 57px) 0;
        }
        .wordmark {
          font-size: clamp(58px, 7.7cqw, 124px);
          line-height: .68;
          font-weight: 900;
          letter-spacing: clamp(-9px, -.7vw, -14px);
          color: var(--navy);
          text-shadow: 0 8px 18px rgba(255,255,255,.18);
        }
        .wordmark span { color: rgba(6,34,62,.55); }
        .tagline {
          margin-top: clamp(8px, 1vh, 14px);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(9px, .68vw, 12px);
          font-weight: 900;
          letter-spacing: clamp(3px, .45vw, 7px);
          white-space: nowrap;
        }
        .tagline:before, .tagline:after, .footer-line:before, .footer-line:after {
          content: "";
          height: 1px;
          background: var(--gold);
        }
        .tagline:before, .tagline:after { width: 42px; }
        .links {
          display: flex;
          justify-content: center;
          gap: clamp(30px, 4.3vw, 82px);
          padding-top: clamp(18px, 2.5vh, 32px);
          font-size: clamp(12px, .85vw, 16px);
          font-weight: 900;
          letter-spacing: 1.8px;
        }
        .join {
          margin-top: clamp(12px, 1.8vh, 22px);
          min-width: clamp(210px, 17vw, 290px);
          padding: clamp(12px, 1.7vh, 18px) 24px;
          border: 1px solid #b98330;
          background: rgba(255,255,255,.36);
          color: #a86e20;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 2.3px;
        }
        .hero {
          position: relative;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          padding: min(2.4%, 24px) min(3.7%, 57px) min(1.2%, 12px);
        }
        .copy { max-width: min(760px, 48vw); }
        h1 {
          margin: 0;
          font-size: clamp(42px, 5.5cqw, 84px);
          line-height: .96;
          letter-spacing: clamp(-4px, -.32vw, -7px);
          color: var(--navy);
        }
        .lead {
          margin: clamp(9px, 1.5vh, 18px) 0 0;
          font-size: clamp(17px, 1.45vw, 29px);
          line-height: 1.25;
          color: #153555;
        }
        .goldline {
          width: 92px;
          height: 2px;
          background: var(--gold);
          margin: clamp(10px, 1.6vh, 22px) 0 clamp(7px, 1vh, 12px);
        }
        .promise {
          margin: 0;
          font-size: clamp(12px, .86vw, 16px);
          font-weight: 900;
        }
        .jet {
          position: absolute;
          left: 52.5%;
          top: 15.5%;
          width: min(32.5%, 500px);
          aspect-ratio: 500 / 150;
          background: url('/ssx-plane-crop.jpg') center / contain no-repeat;
          filter: drop-shadow(0 12px 12px rgba(2,20,36,.18));
        }
        .people { display: none; }
        .person {
          position: absolute;
          bottom: 0;
          width: 34%;
          height: 92%;
          border-radius: 45% 45% 20% 20%;
          background: linear-gradient(180deg, #5c4b37, #151719 38%, #101316);
        }
        .person:before {
          content: "";
          position: absolute;
          left: 31%;
          top: -10%;
          width: 36%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: #b78b4b;
        }
        .person.tall { right: 0; }
        .person.small { left: 15%; height: 60%; width: 28%; }
        .rocks {
          position: absolute;
          inset: auto -18% -8% -10%;
          height: 28%;
          background: linear-gradient(135deg, #151515, #333027 55%, #090a0b);
          clip-path: polygon(0 100%, 8% 42%, 22% 58%, 33% 18%, 46% 48%, 58% 22%, 75% 48%, 88% 14%, 100% 55%, 100% 100%);
        }
        .lower {
          align-self: end;
          display: grid;
          grid-template-columns: 27% 36% 30%;
          align-items: end;
          justify-content: space-between;
          gap: min(4.2%, 64px);
          margin-top: min(4.2%, 43px);
        }
        .side-card, .right-card {
          min-height: clamp(170px, 22vh, 250px);
          border-radius: 12px;
          background: var(--panel);
          border: 1px solid rgba(186,213,230,.16);
          box-shadow: 0 24px 54px rgba(0,20,39,.22);
          backdrop-filter: blur(3px);
        }
        .side-card { padding: clamp(16px, 2.4vh, 28px) 26px clamp(16px, 2.4vh, 28px) 48px; }
        .feature {
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 18px;
          color: white;
          margin-bottom: clamp(13px, 2vh, 28px);
        }
        .feature:last-child { margin-bottom: 0; }
        .icon { color: var(--gold); font-size: clamp(34px, 3vw, 44px); line-height: 1; text-align: center; }
        .feature b { display: block; font-size: clamp(11px, .75vw, 13px); margin-bottom: 6px; }
        .feature span { display: block; font-size: clamp(11px, .75vw, 13px); line-height: 1.42; }
        .intake { color: white; }
        .drop {
          height: min(21.5cqh, 220px);
          border: 2px dashed rgba(255,255,255,.92);
          border-radius: 14px;
          background: rgba(2, 31, 56, .94);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          box-shadow: 0 13px 32px rgba(0,16,31,.5), inset 0 0 24px rgba(255,255,255,.06);
        }
        .upload { color: var(--gold); font-size: clamp(42px, 5vh, 58px); line-height: 1; margin-bottom: 6px; }
        .drop strong { display: block; font-size: clamp(17px, 1.25vw, 22px); margin-bottom: 5px; }
        .drop small { display: block; font-size: clamp(11px, .75vw, 13px); line-height: 1.42; color: rgba(255,255,255,.92); }
        .browse { color: #dfa747; }
        .or { display: flex; align-items: center; gap: 18px; margin: clamp(8px, 1.4vh, 18px) 0 6px; font-weight: 900; letter-spacing: 1px; }
        .or:before, .or:after { content: ""; height: 1px; flex: 1; background: rgba(223,233,241,.6); }
        label { display: block; margin-bottom: 5px; font-size: 12px; }
        textarea {
          width: 100%;
          height: min(7.7cqh, 79px);
          resize: none;
          color: white;
          background: rgba(3,23,43,.82);
          border: 1px solid rgba(172,199,220,.55);
          border-radius: 6px;
          padding: 12px;
          font: inherit;
        }
        textarea::placeholder { color: rgba(255,255,255,.46); }
        .buttons { display: flex; justify-content: space-between; gap: 14px; margin-top: 8px; }
        .btn {
          height: 34px;
          border: 1px solid var(--gold);
          background: rgba(3,31,55,.54);
          color: #d8a24b;
          padding: 0 28px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }
        .submit { min-width: 260px; }
        .status, .filelist { margin-top: 6px; color: #ffe1a9; font-size: 12px; line-height: 1.3; }
        .right-card { display: grid; grid-template-columns: 1fr 1.25fr; gap: 24px; align-items: center; padding: 22px 26px 22px 0; }
        .preview {
          height: clamp(94px, 13vh, 145px);
          border-radius: 9px;
          background: linear-gradient(135deg, #f8fbff, #b8c7d6);
          box-shadow: 0 18px 30px rgba(0,0,0,.24);
          position: relative;
          overflow: hidden;
        }
        .preview:before { content: "SSX"; position: absolute; top: 10px; left: 12px; color: #082642; font-size: 10px; font-weight: 900; }
        .preview:after {
          content: "";
          position: absolute;
          inset: 34px 14px 14px;
          border-radius: 6px;
          background: repeating-linear-gradient(180deg, rgba(10,45,77,.18) 0 8px, transparent 8px 18px), linear-gradient(90deg, rgba(9,44,77,.18), transparent 48%);
        }
        .right-features .feature { margin-bottom: clamp(12px, 1.8vh, 24px); }
        .footer {
          background: rgba(229,238,246,.98);
          min-height: 13.7%;
          padding: clamp(8px, 1.3vh, 16px) clamp(22px, 4vw, 74px) clamp(8px, 1.6vh, 18px);
          color: var(--ink);
        }
        .footer-line { display: flex; align-items: center; justify-content: center; gap: 16px; font-size: clamp(10px, .75vw, 13px); font-weight: 900; letter-spacing: clamp(1.8px, .2vw, 3px); text-align: center; }
        .footer-line:before, .footer-line:after { flex: 1; }
        .footer-bottom { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 22px; margin-top: clamp(10px, 1.7vh, 24px); }
        .footer-brand { font-size: clamp(24px, 2vw, 31px); font-weight: 900; letter-spacing: -3px; }
        .footer-brand span { margin-left: 8px; font-size: 11px; letter-spacing: 2px; font-weight: 800; }
        .footer-links { display: flex; gap: clamp(30px, 3vw, 52px); font-size: 12px; font-weight: 800; letter-spacing: 1px; }
        .copyright { justify-self: end; font-size: 12px; }

        @media (min-width: 1181px) and (max-height: 900px) {
          .wordmark { font-size: clamp(58px, 6vw, 105px); }
          .links { padding-top: 15px; }
          .join { margin-top: 8px; }
          .hero { padding-top: 4px; }
          h1 { font-size: clamp(38px, 4vw, 66px); }
          .lead { font-size: clamp(15px, 1.15vw, 21px); margin-top: 7px; }
          .goldline { margin-top: 8px; margin-bottom: 6px; }
          .jet { top: 10%; }
          .people { display: none; }
          .lower { margin-top: 8px; }
          .side-card, .right-card { min-height: 150px; }
          .feature { margin-bottom: 10px; }
          .icon { font-size: 33px; }
          .feature b, .feature span, .drop small { font-size: 11px; }
          .drop { height: 122px; }
          .upload { font-size: 34px; }
          .or { margin: 5px 0 3px; }
          textarea { height: 42px; padding: 9px 12px; }
          .btn { height: 28px; }
          .preview { height: 82px; }
          .footer-bottom { margin-top: 8px; }
        }

        @media (max-width: 1180px) {
          .page { display: block; }
          .stage { width: 100%; height: auto; min-height: auto; overflow: visible; container-type: inline-size; background-size: cover, cover, cover; }
          .nav { grid-template-columns: 1fr auto; }
          .links { display: none; }
          .hero { grid-template-rows: auto auto; }
          .copy { max-width: min(700px, 80vw); }
          .jet { left: 55%; top: 18%; width: 35vw; }
          .people { right: 5vw; top: 280px; opacity: .92; }
          .lower { grid-template-columns: 1fr 1.35fr; margin-top: clamp(50px, 11vh, 120px); }
          .right-card { grid-column: 1 / 3; grid-template-columns: 220px 1fr; padding-left: 24px; }
        }
        @media (max-width: 820px) {
          .stage {
            display: block;
            background:
              linear-gradient(180deg, rgba(231,241,249,.34) 0%, rgba(231,241,249,.1) 38%, rgba(3,31,55,.94) 58%, rgba(3,31,55,.98) 88%, rgba(226,236,245,.97) 88%),
              url('/ssx-hero-clouds.jpg') 63% top / auto 55vh no-repeat,
              #06223e;
          }
          .nav { grid-template-columns: 1fr; gap: 10px; padding-top: 18px; }
          .join, .jet { display: none; }
          .people { opacity: .45; right: -8px; top: 235px; transform: scale(.75); transform-origin: top right; }
          .hero { padding-top: 28px; }
          .copy { max-width: 100%; }
          h1 { font-size: clamp(40px, 12vw, 58px); }
          .lead { font-size: 20px; }
          .lower { grid-template-columns: 1fr; gap: 18px; margin-top: 42px; }
          .side-card, .right-card { min-height: auto; }
          .side-card { padding: 22px; }
          .right-card { grid-column: auto; grid-template-columns: 1fr; padding: 22px; }
          .preview { display: none; }
          .buttons { flex-direction: column; }
          .btn, .submit { width: 100%; min-width: 0; }
          .footer-bottom { grid-template-columns: 1fr; text-align: center; justify-items: center; }
          .copyright { justify-self: center; }
          .footer-links { gap: 28px; flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 520px) {
          .nav, .hero, .footer { padding-left: 16px; padding-right: 16px; }
          .wordmark { font-size: 62px; letter-spacing: -7px; }
          .tagline { font-size: 9px; letter-spacing: 2.8px; }
          .tagline:before, .tagline:after { width: 28px; }
          .drop { height: 210px; padding: 18px; }
          .upload { font-size: 48px; }
          .footer-line { font-size: 10px; letter-spacing: 1.7px; }
          .footer-brand span { display: block; margin: 4px 0 0; }
        }
      `}</style>

      <div className="stage">
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
          <div className="jet" aria-hidden="true" />
          <div className="people" aria-hidden="true"><div className="person small" /><div className="person tall" /><div className="rocks" /></div>

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
