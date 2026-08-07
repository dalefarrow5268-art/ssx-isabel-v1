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
    <main className="ssx-page">
      <style jsx>{`
        * { box-sizing: border-box; }
        .ssx-page {
          --navy: #06233f;
          --navy2: #021d35;
          --gold: #c89034;
          --paper: #e7f0f7;
          min-height: 100svh;
          color: var(--navy);
          font-family: Arial, Helvetica, sans-serif;
          background: var(--paper);
          overflow-x: hidden;
        }
        .stage {
          min-height: 100svh;
          display: grid;
          grid-template-rows: auto 1fr auto;
          overflow: hidden;
          position: relative;
          isolation: isolate;
          background:
            linear-gradient(180deg, rgba(230,242,250,.10) 0%, rgba(255,255,255,.16) 36%, rgba(6,35,63,.28) 54%, rgba(3,28,51,.98) 70%, rgba(3,28,51,1) 86.8%, rgba(231,240,247,1) 86.9%),
            url("/ssx-hero-clouds.jpg") center 14% / 100% auto no-repeat,
            linear-gradient(180deg, #dfeef8 0%, #fbfbf8 44%, #05233f 68%, #031d35 86.8%, #e7f0f7 86.9%);
        }
        .stage::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 13.1%;
          height: 30%;
          z-index: -1;
          background: linear-gradient(180deg, rgba(4,33,59,0), rgba(3,28,51,.96) 46%, #031d35);
        }
        .nav {
          display: grid;
          grid-template-columns: 360px 1fr 290px;
          align-items: start;
          gap: clamp(28px, 4vw, 72px);
          padding: clamp(20px, 3.3vh, 44px) clamp(46px, 3.8vw, 72px) 0;
        }
        .logo {
          width: clamp(260px, 23vw, 370px);
          line-height: .68;
          font-size: clamp(88px, 8.3vw, 150px);
          font-weight: 900;
          letter-spacing: -.09em;
          color: var(--navy);
        }
        .logo span { color: rgba(6,35,63,.58); }
        .brandline {
          margin-top: clamp(8px, .9vh, 12px);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(10px, .75vw, 13px);
          font-weight: 900;
          letter-spacing: clamp(3px, .42vw, 6px);
          white-space: nowrap;
        }
        .brandline::before, .brandline::after, .footer-kicker::before, .footer-kicker::after {
          content: "";
          height: 1px;
          background: var(--gold);
        }
        .brandline::before, .brandline::after { width: 40px; }
        .navlinks {
          display: flex;
          justify-content: center;
          gap: clamp(34px, 4.3vw, 76px);
          padding-top: clamp(22px, 2.2vh, 35px);
          font-size: clamp(12px, .9vw, 16px);
          font-weight: 900;
          letter-spacing: 1.7px;
        }
        .join {
          justify-self: end;
          margin-top: clamp(12px, 1.8vh, 22px);
          width: clamp(230px, 17.5vw, 286px);
          height: clamp(40px, 5vh, 48px);
          border: 1px solid #b98230;
          background: rgba(255,255,255,.38);
          color: #a76b1e;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 2.4px;
        }
        .hero {
          position: relative;
          display: grid;
          grid-template-rows: auto minmax(0,1fr);
          padding: clamp(28px, 4.5vh, 66px) clamp(46px, 3.8vw, 72px) clamp(8px, 1.1vh, 16px);
        }
        .copy { max-width: min(760px, 52vw); }
        h1 {
          margin: 0;
          color: var(--navy);
          font-size: clamp(56px, 5.7vw, 92px);
          line-height: .98;
          letter-spacing: -.065em;
          font-weight: 900;
        }
        .lead {
          margin: clamp(12px, 1.5vh, 18px) 0 0;
          color: #153654;
          font-size: clamp(22px, 1.7vw, 30px);
          line-height: 1.25;
        }
        .rule {
          width: 88px;
          height: 2px;
          background: var(--gold);
          margin: clamp(14px, 1.8vh, 22px) 0 clamp(8px, 1.1vh, 12px);
        }
        .promise {
          margin: 0;
          color: var(--navy);
          font-size: clamp(12px, .9vw, 16px);
          font-weight: 900;
        }
        .aircraft {
          position: absolute;
          left: 52.4%;
          top: 17.6%;
          width: clamp(360px, 32vw, 540px);
          transform: rotate(-3deg);
          filter: drop-shadow(0 16px 14px rgba(3,22,39,.22));
        }
        .work {
          align-self: end;
          width: min(92vw, 1400px);
          margin: clamp(56px, 10vh, 150px) auto 0;
          display: grid;
          grid-template-columns: minmax(285px, 30%) minmax(500px, 38%) minmax(340px, 30%);
          gap: clamp(34px, 4.2vw, 72px);
          align-items: end;
        }
        .panel {
          color: white;
          border: 1px solid rgba(191,218,236,.18);
          border-radius: 10px;
          background: rgba(2,29,52,.76);
          box-shadow: 0 24px 54px rgba(0,18,34,.22);
          backdrop-filter: blur(2px);
        }
        .left-panel {
          padding: clamp(20px, 2.5vh, 30px) clamp(24px, 2.1vw, 36px);
        }
        .feature {
          display: grid;
          grid-template-columns: 50px 1fr;
          gap: 18px;
          align-items: start;
          margin-bottom: clamp(16px, 2.4vh, 30px);
        }
        .feature:last-child { margin-bottom: 0; }
        .glyph {
          color: var(--gold);
          font-size: clamp(34px, 3vw, 46px);
          line-height: 1;
          text-align: center;
        }
        .feature b {
          display: block;
          margin: 0 0 6px;
          font-size: clamp(11px, .78vw, 13px);
          letter-spacing: .15px;
        }
        .feature span {
          display: block;
          font-size: clamp(11px, .78vw, 13px);
          line-height: 1.42;
        }
        .drop {
          height: clamp(198px, 23vh, 242px);
          display: grid;
          place-items: center;
          text-align: center;
          cursor: pointer;
          color: white;
          border: 2px dashed rgba(255,255,255,.92);
          border-radius: 14px;
          background: rgba(2,29,52,.94);
          box-shadow: 0 16px 40px rgba(0,16,31,.44), inset 0 0 28px rgba(255,255,255,.06);
        }
        .upload {
          color: var(--gold);
          font-size: clamp(44px, 5.2vh, 60px);
          line-height: 1;
          margin-bottom: 8px;
        }
        .drop strong {
          display: block;
          font-size: clamp(18px, 1.35vw, 23px);
          margin-bottom: 6px;
        }
        .drop small {
          display: block;
          color: rgba(255,255,255,.91);
          font-size: clamp(11px, .78vw, 13px);
          line-height: 1.42;
        }
        .browse { color: #e1a446; }
        .filelist, .status {
          margin-top: 7px;
          color: #ffe0a3;
          font-size: 12px;
          line-height: 1.35;
        }
        .or {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: clamp(10px, 1.6vh, 18px) 0 6px;
          color: white;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .or::before, .or::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(222,235,244,.62);
        }
        label {
          display: block;
          margin-bottom: 6px;
          color: white;
          font-size: 12px;
        }
        textarea {
          width: 100%;
          height: clamp(70px, 8.7vh, 94px);
          resize: none;
          border: 1px solid rgba(175,204,225,.55);
          border-radius: 5px;
          background: rgba(3,24,43,.86);
          color: white;
          padding: 12px;
          font: inherit;
        }
        textarea::placeholder { color: rgba(255,255,255,.46); }
        .buttons {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 8px;
        }
        .btn {
          height: 34px;
          border: 1px solid var(--gold);
          background: rgba(3,31,55,.58);
          color: #dca54b;
          padding: 0 28px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }
        .submit { min-width: 265px; }
        .right-panel {
          display: grid;
          grid-template-columns: minmax(120px, .92fr) 1.25fr;
          gap: 28px;
          align-items: center;
          padding: clamp(20px, 2.5vh, 30px) clamp(20px, 2vw, 34px);
        }
        .card-art {
          height: clamp(98px, 12.6vh, 136px);
          border-radius: 8px;
          background: linear-gradient(135deg, #f8fbff, #bac9d8);
          box-shadow: 0 18px 30px rgba(0,0,0,.24);
          position: relative;
          overflow: hidden;
        }
        .card-art::before {
          content: "SSX";
          position: absolute;
          top: 10px;
          left: 12px;
          color: var(--navy);
          font-size: 10px;
          font-weight: 900;
        }
        .card-art::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          top: 36px;
          bottom: 14px;
          background: repeating-linear-gradient(180deg, rgba(11,49,82,.18) 0 8px, transparent 8px 18px);
          border-radius: 4px;
        }
        .footer {
          min-height: 13.1svh;
          padding: clamp(9px, 1.4vh, 17px) clamp(44px, 4vw, 72px) clamp(10px, 1.7vh, 18px);
          background: rgba(231,240,247,.98);
        }
        .footer-kicker {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          font-size: clamp(10px, .78vw, 13px);
          font-weight: 900;
          letter-spacing: clamp(1.8px, .22vw, 3px);
        }
        .footer-kicker::before, .footer-kicker::after { flex: 1; }
        .footer-bottom {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 22px;
          margin-top: clamp(11px, 1.9vh, 24px);
        }
        .footer-logo {
          font-size: clamp(24px, 2.1vw, 32px);
          font-weight: 900;
          letter-spacing: -.1em;
        }
        .footer-logo span {
          margin-left: 10px;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
        }
        .footer-links {
          display: flex;
          gap: clamp(30px, 3.2vw, 56px);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .9px;
        }
        .copyright {
          justify-self: end;
          font-size: 12px;
        }

        @media (min-width: 1181px) and (max-height: 930px) {
          .nav { padding-top: 15px; }
          .logo { font-size: clamp(74px, 7vw, 120px); }
          .navlinks { padding-top: 20px; }
          .join { margin-top: 12px; height: 42px; }
          .hero { padding-top: 19px; }
          h1 { font-size: clamp(48px, 5vw, 78px); }
          .lead { font-size: clamp(18px, 1.35vw, 24px); }
          .work { margin-top: clamp(30px, 6vh, 72px); }
          .drop { height: 170px; }
          textarea { height: 60px; }
          .panel { border-radius: 9px; }
          .left-panel, .right-panel { padding-top: 19px; padding-bottom: 19px; }
          .feature { margin-bottom: 19px; }
          .card-art { height: 110px; }
          .footer { min-height: 100px; }
          .footer-bottom { margin-top: 16px; }
        }

        @media (max-width: 1180px) {
          .stage {
            overflow: visible;
            background:
              linear-gradient(180deg, rgba(230,242,250,.10) 0%, rgba(255,255,255,.12) 34%, rgba(6,35,63,.35) 52%, rgba(3,28,51,.98) 66%, rgba(3,28,51,1) 88%, rgba(231,240,247,1) 88.1%),
              url("/ssx-hero-clouds.jpg") center top / auto 58vh no-repeat,
              linear-gradient(180deg, #dfeef8 0%, #fbfbf8 44%, #05233f 68%, #031d35 88%, #e7f0f7 88.1%);
          }
          .nav { grid-template-columns: 1fr auto; }
          .navlinks { display: none; }
          .copy { max-width: min(680px, 78vw); }
          .aircraft { left: 58%; top: 20%; width: 34vw; }
          .work {
            grid-template-columns: 1fr 1.35fr;
            margin-top: clamp(54px, 10vh, 110px);
          }
          .right-panel {
            grid-column: 1 / 3;
            grid-template-columns: 220px 1fr;
          }
        }

        @media (max-width: 820px) {
          .stage {
            display: block;
            min-height: 100svh;
            background:
              linear-gradient(180deg, rgba(231,241,249,.28) 0%, rgba(231,241,249,.08) 35%, rgba(3,31,55,.90) 54%, rgba(3,31,55,.99) 87%, rgba(226,236,245,.98) 87.1%),
              url("/ssx-hero-clouds.jpg") 63% top / auto 55vh no-repeat,
              #06233f;
          }
          .nav {
            grid-template-columns: 1fr;
            padding: 18px 18px 0;
          }
          .join, .aircraft { display: none; }
          .hero { padding: 32px 18px 0; }
          .copy { max-width: 100%; }
          h1 { font-size: clamp(40px, 12vw, 58px); }
          .lead { font-size: 20px; }
          .work {
            width: auto;
            grid-template-columns: 1fr;
            gap: 18px;
            margin: 44px 18px 0;
          }
          .right-panel { grid-column: auto; grid-template-columns: 1fr; }
          .card-art { display: none; }
          .buttons { flex-direction: column; }
          .btn, .submit { width: 100%; min-width: 0; }
          .footer {
            padding: 18px;
          }
          .footer-bottom {
            grid-template-columns: 1fr;
            text-align: center;
            justify-items: center;
          }
          .footer-logo span {
            display: block;
            margin: 4px 0 0;
          }
          .footer-links {
            flex-wrap: wrap;
            justify-content: center;
          }
          .copyright { justify-self: center; }
        }

        @media (max-width: 520px) {
          .logo { font-size: 62px; letter-spacing: -.1em; }
          .brandline { font-size: 9px; letter-spacing: 2.6px; }
          .brandline::before, .brandline::after { width: 28px; }
          .drop { height: 210px; padding: 18px; }
          .footer-kicker { font-size: 10px; letter-spacing: 1.6px; }
        }
      `}</style>

      <div className="stage">
        <nav className="nav">
          <div>
            <div className="logo">SS<span>X</span></div>
            <div className="brandline">BUILDING HUMAN POTENTIAL</div>
          </div>
          <div className="navlinks"><span>VISION</span><span>PEOPLE</span><span>COMMUNITY</span><span>IMPACT</span><span>ABOUT</span></div>
          <button className="join">JOIN THE MOVEMENT</button>
        </nav>

        <section className="hero">
          <div className="copy">
            <h1>SSX Contact System<br />Intake Center</h1>
            <p className="lead">Drop, paste, and upload your emails.<br />We’ll do the rest.</p>
            <div className="rule" />
            <p className="promise">Turn email into action. Build better relationships.</p>
          </div>

          <svg className="aircraft" viewBox="0 0 680 170" aria-hidden="true">
            <defs>
              <linearGradient id="body" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset=".46" stopColor="#d5e0e8" />
                <stop offset=".52" stopColor="#082743" />
                <stop offset=".67" stopColor="#f3f7fa" />
                <stop offset="1" stopColor="#718493" />
              </linearGradient>
              <linearGradient id="blueWing" x1="0" x2="1">
                <stop offset="0" stopColor="#07223d" />
                <stop offset=".48" stopColor="#0f78b5" />
                <stop offset=".54" stopColor="#e8f5fb" />
                <stop offset="1" stopColor="#6f8290" />
              </linearGradient>
            </defs>
            <path d="M48 92 C168 48 520 45 641 77 C670 85 666 96 636 101 C493 128 168 130 48 92Z" fill="url(#body)" />
            <path d="M78 86 L6 54 L110 61 L164 16 L218 16 L160 88Z" fill="url(#blueWing)" />
            <path d="M282 88 L416 158 L480 158 L362 91Z" fill="url(#blueWing)" />
            <path d="M340 72 L448 24 L512 25 L407 84Z" fill="url(#blueWing)" opacity=".94" />
            <path d="M70 88 C178 70 514 64 633 80" fill="none" stroke="#0a2a48" strokeWidth="3" opacity=".55" />
            {Array.from({ length: 18 }).map((_, index) => (
              <circle key={index} cx={250 + index * 18} cy={80 - index * .22} r="4.2" fill="#0b2b49" opacity=".75" />
            ))}
            <text x="322" y="105" fill="#092743" fontSize="25" fontWeight="900" letterSpacing="1">SSX</text>
          </svg>

          <div className="work">
            <aside className="panel left-panel">
              <div className="feature"><div className="glyph">✉</div><div><b>DROP OR PASTE</b><span>Upload emails or paste<br />content in seconds</span></div></div>
              <div className="feature"><div className="glyph">♙</div><div><b>SMART PROCESSING</b><span>We extract to-dos, contacts,<br />and key information</span></div></div>
              <div className="feature"><div className="glyph">◷</div><div><b>STAY AHEAD</b><span>Organized insights. Urgent<br />alerts. Better results.</span></div></div>
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

            <aside className="panel right-panel">
              <div className="card-art" />
              <div>
                <div className="feature"><div className="glyph">⌖</div><div><b>BUILT FOR DALE</b><span>Your tasks. Your priorities.<br />Your success.</span></div></div>
                <div className="feature"><div className="glyph">⌑</div><div><b>SECURE &amp; RELIABLE</b><span>Enterprise-grade security<br />and cloud infrastructure</span></div></div>
                <div className="feature"><div className="glyph">↗</div><div><b>MORE DONE, LESS NOISE</b><span>Focus on what matters.<br />We handle the rest.</span></div></div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-kicker">CONNECTING PEOPLE. ALIGNING PROJECTS. BUILDING TRUST.</div>
          <div className="footer-bottom">
            <div className="footer-logo">SSX <span>BUILDING HUMAN POTENTIAL</span></div>
            <div className="footer-links"><span>PRIVACY</span><span>TERMS</span><span>SUPPORT</span></div>
            <div className="copyright">© 2024 SSX Contact System</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
