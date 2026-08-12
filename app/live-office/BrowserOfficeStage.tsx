'use client';

import type { IsabelCoreState } from './cloudflare-core-bridge';

type Props = {
  state: IsabelCoreState;
};

const ANCHOR_POSITION: Record<string, { left: string; bottom: string }> = {
  ISABEL_DESK_STAND: { left: '70%', bottom: '18%' },
  ISABEL_DESK_SEATED: { left: '70%', bottom: '13%' },
  SCREEN_01_VIEW: { left: '45%', bottom: '20%' },
  SCREEN_02_VIEW: { left: '56%', bottom: '20%' },
  SCREEN_03_VIEW: { left: '45%', bottom: '16%' },
  SCREEN_04_VIEW: { left: '56%', bottom: '16%' },
};

export default function BrowserOfficeStage({ state }: Props) {
  const position = ANCHOR_POSITION[state.anchor] || ANCHOR_POSITION.ISABEL_DESK_STAND;
  const seated = state.pose === 'seated';

  return (
    <section style={stage} aria-label="Isabel browser-rendered office">
      <div style={ceiling} />
      <div style={backWall}>
        <div style={cabinetry} />
        <div style={monitorFrame}>
          <Screen label="PROJECT OVERVIEW" route="/screens/project-overview" />
          <Screen label="SCHEDULE" route="/screens/schedule" />
          <Screen label="RISK" route="/screens/risk" />
          <Screen label="EVIDENCE" route="/screens/evidence" />
        </div>
      </div>

      <div style={leftWall}>
        <div style={windowGrid}>
          {[0, 1, 2].map(id => <div key={id} style={windowPane}><div style={skyGlow} /></div>)}
        </div>
      </div>

      <div style={floor} />
      <div style={desk}>
        <div style={deskTop} />
        <div style={deskLegLeft} />
        <div style={deskLegRight} />
      </div>
      <div style={artFrame}><div style={artMat}><div style={artImage}>FLATIRON</div></div></div>
      <div style={guestChairLeft} />
      <div style={guestChairRight} />

      <div style={{ ...avatarWrap, left: position.left, bottom: position.bottom }}>
        <div style={{ ...avatarBody, height: seated ? 84 : 118 }}>
          <div style={avatarHead} />
          <div style={avatarTorso} />
          {!seated ? <><div style={avatarLegLeft} /><div style={avatarLegRight} /></> : null}
        </div>
        <div style={avatarLabel}>ISABEL</div>
      </div>

      <div style={hud}>
        <span>Browser renderer</span>
        <span>rev {state.revision}</span>
        <span>{state.activity}</span>
      </div>
    </section>
  );
}

function Screen({ label, route }: { label: string; route: string }) {
  return (
    <a href={route} style={screen} aria-label={label}>
      <div style={screenGlow} />
      <div style={screenLabel}>{label}</div>
    </a>
  );
}

const stage: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  overflow: 'hidden',
  background: 'linear-gradient(180deg,#d7d4cd 0%,#c8c3b8 64%,#9f9789 64%,#8f8779 100%)',
  border: '1px solid #2d333b',
  boxShadow: 'inset 0 0 90px rgba(0,0,0,.2)',
};

const ceiling: React.CSSProperties = { position: 'absolute', left: '5%', right: '4%', top: '3%', height: '10%', border: '8px solid rgba(255,255,255,.48)', boxShadow: '0 0 28px rgba(255,242,214,.5) inset', transform: 'perspective(700px) rotateX(58deg)', transformOrigin: 'top' };
const backWall: React.CSSProperties = { position: 'absolute', left: '26%', top: '10%', width: '69%', height: '56%', background: 'linear-gradient(90deg,#302a25,#1c1917 72%,#29231f)', boxShadow: 'inset 0 0 55px rgba(0,0,0,.35)' };
const cabinetry: React.CSSProperties = { position: 'absolute', inset: '5%', border: '1px solid rgba(255,255,255,.06)', backgroundImage: 'linear-gradient(90deg,transparent 24%,rgba(255,255,255,.04) 25%,transparent 26%,transparent 49%,rgba(255,255,255,.04) 50%,transparent 51%,transparent 74%,rgba(255,255,255,.04) 75%,transparent 76%)' };
const monitorFrame: React.CSSProperties = { position: 'absolute', left: '15%', top: '10%', width: '52%', aspectRatio: '16 / 9', padding: '2.1%', background: '#f5f2ea', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.2%', boxShadow: '0 8px 30px rgba(0,0,0,.32)' };
const screen: React.CSSProperties = { position: 'relative', display: 'block', overflow: 'hidden', background: 'linear-gradient(145deg,#07101a,#13283b)', color: '#fff', textDecoration: 'none', boxShadow: 'inset 0 0 0 2px #0d1117' };
const screenGlow: React.CSSProperties = { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%,rgba(74,162,255,.22),transparent 45%),linear-gradient(120deg,transparent 55%,rgba(255,255,255,.08))' };
const screenLabel: React.CSSProperties = { position: 'absolute', left: '7%', bottom: '8%', fontSize: 'clamp(8px,1vw,15px)', letterSpacing: '.12em', fontWeight: 700, opacity: .9 };
const leftWall: React.CSSProperties = { position: 'absolute', left: 0, top: '8%', width: '29%', height: '61%', background: 'linear-gradient(90deg,#b8b5ad,#d9d7d2)', clipPath: 'polygon(0 0,100% 8%,100% 100%,0 100%)' };
const windowGrid: React.CSSProperties = { position: 'absolute', left: '8%', top: '11%', right: '10%', bottom: '11%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3%' };
const windowPane: React.CSSProperties = { position: 'relative', border: '5px solid #2a2927', background: 'linear-gradient(180deg,#b8d4e9,#e9eef2 58%,#d7d6d0)', boxShadow: 'inset 0 0 18px rgba(255,255,255,.65)' };
const skyGlow: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(130deg,rgba(255,255,255,.55),transparent 50%)' };
const floor: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, height: '36%', background: 'linear-gradient(180deg,#a7a093,#8d8578)', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' };
const desk: React.CSSProperties = { position: 'absolute', left: '58%', bottom: '16%', width: '30%', height: '22%', zIndex: 6 };
const deskTop: React.CSSProperties = { position: 'absolute', left: 0, right: 0, top: '17%', height: '16%', background: 'linear-gradient(#49352a,#2f211a)', boxShadow: '0 8px 15px rgba(0,0,0,.28)', transform: 'skewX(-5deg)' };
const deskLegLeft: React.CSSProperties = { position: 'absolute', left: '8%', top: '31%', width: '7%', height: '60%', background: '#2b211b' };
const deskLegRight: React.CSSProperties = { position: 'absolute', right: '8%', top: '31%', width: '7%', height: '60%', background: '#2b211b' };
const artFrame: React.CSSProperties = { position: 'absolute', right: '6.5%', top: '24%', width: '14%', aspectRatio: '4 / 5', background: '#161616', padding: '1%', zIndex: 4 };
const artMat: React.CSSProperties = { width: '100%', height: '100%', background: '#f5f2ea', padding: '8%' };
const artImage: React.CSSProperties = { width: '100%', height: '100%', background: 'linear-gradient(160deg,#9b9b96,#4f504e)', display: 'grid', placeItems: 'center', color: '#eee', fontSize: 'clamp(7px,.7vw,11px)', letterSpacing: '.12em' };
const guestChairLeft: React.CSSProperties = { position: 'absolute', left: '27%', bottom: '6%', width: '10%', height: '17%', background: '#17191b', borderRadius: '35% 35% 12% 12%', transform: 'rotate(-8deg)', zIndex: 8, opacity: .9 };
const guestChairRight: React.CSSProperties = { ...guestChairLeft, left: '39%', transform: 'rotate(7deg)' };
const avatarWrap: React.CSSProperties = { position: 'absolute', width: 70, transform: 'translateX(-50%)', transition: 'left 900ms ease,bottom 900ms ease', zIndex: 7, textAlign: 'center' };
const avatarBody: React.CSSProperties = { position: 'relative', width: 52, margin: '0 auto', transition: 'height 450ms ease' };
const avatarHead: React.CSSProperties = { position: 'absolute', left: 14, top: 0, width: 24, height: 30, borderRadius: '48% 48% 44% 44%', background: 'linear-gradient(145deg,#9f6f57,#c69072)', boxShadow: '0 -5px 0 2px #2c211d' };
const avatarTorso: React.CSSProperties = { position: 'absolute', left: 7, top: 28, width: 38, height: 55, borderRadius: '13px 13px 5px 5px', background: 'linear-gradient(90deg,#17191c,#2a2d31,#131518)' };
const avatarLegLeft: React.CSSProperties = { position: 'absolute', left: 13, top: 78, width: 10, height: 39, background: '#17191c', transform: 'rotate(2deg)', transformOrigin: 'top' };
const avatarLegRight: React.CSSProperties = { position: 'absolute', left: 29, top: 78, width: 10, height: 39, background: '#17191c', transform: 'rotate(-2deg)', transformOrigin: 'top' };
const avatarLabel: React.CSSProperties = { marginTop: 4, fontSize: 9, letterSpacing: '.18em', color: '#fff', textShadow: '0 1px 4px #000' };
const hud: React.CSSProperties = { position: 'absolute', left: 12, bottom: 10, zIndex: 20, display: 'flex', gap: 12, padding: '6px 9px', background: 'rgba(9,12,16,.76)', border: '1px solid rgba(255,255,255,.12)', color: '#dfe6ef', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' };
