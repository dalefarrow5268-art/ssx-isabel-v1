const rows = [
  ['Structural Steel', 'On Track', '72%'],
  ['MEP Rough-In', 'Watch', '51%'],
  ['Exterior Envelope', 'On Track', '67%'],
  ['Interiors', 'Next', '34%'],
];

export default function ScheduleScreen() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b1016', color: '#ecf1f5', padding: 34, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 15, opacity: 0.7, letterSpacing: 1.2 }}>SSX • SCHEDULE</div>
      <h1 style={{ margin: '10px 0 26px', fontSize: 34 }}>Milestone Progress</h1>
      <div style={{ display: 'grid', gap: 14 }}>
        {rows.map(([name, status, pct]) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '1.5fr .7fr .5fr', gap: 12, border: '1px solid #263645', padding: 18, alignItems: 'center' }}>
            <div style={{ fontSize: 20 }}>{name}</div>
            <div style={{ opacity: 0.8 }}>{status}</div>
            <div style={{ fontSize: 24, textAlign: 'right' }}>{pct}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
