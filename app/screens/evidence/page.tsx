const feeds = [
  ['CAM-01', 'North elevation', 'Live'],
  ['CAM-02', 'Loading dock', 'Live'],
  ['CAM-03', 'Level 18 interior', 'Live'],
  ['DOC-114', 'Concrete pour photos', '12 items'],
];

export default function EvidenceScreen() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0f14', color: '#e9eef2', padding: 34, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 15, opacity: 0.7, letterSpacing: 1.2 }}>SSX • CAMERAS / EVIDENCE</div>
      <h1 style={{ margin: '10px 0 26px', fontSize: 34 }}>Field Evidence</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {feeds.map(([id, title, state]) => (
          <div key={id} style={{ minHeight: 190, border: '1px solid #2d3a44', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>{id}</div>
              <div style={{ fontSize: 22, marginTop: 8 }}>{title}</div>
            </div>
            <div style={{ opacity: 0.8 }}>{state}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
