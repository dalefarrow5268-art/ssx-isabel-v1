const risks = [
  ['R-014', 'Steel delivery', 'High', 'Open'],
  ['R-021', 'AHU lead time', 'Medium', 'Mitigating'],
  ['R-027', 'Weather exposure', 'Low', 'Monitoring'],
];

export default function RiskScreen() {
  return (
    <main style={{ minHeight: '100vh', background: '#101116', color: '#f3f4f6', padding: 34, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 15, opacity: 0.7, letterSpacing: 1.2 }}>SSX • RISK / ISSUES</div>
      <h1 style={{ margin: '10px 0 26px', fontSize: 34 }}>Active Risk Register</h1>
      <div style={{ display: 'grid', gap: 14 }}>
        {risks.map(([id, title, severity, state]) => (
          <div key={id} style={{ display: 'grid', gridTemplateColumns: '.55fr 1.6fr .65fr .8fr', gap: 12, border: '1px solid #393b46', padding: 18, alignItems: 'center' }}>
            <div style={{ opacity: 0.72 }}>{id}</div>
            <div style={{ fontSize: 19 }}>{title}</div>
            <div>{severity}</div>
            <div style={{ textAlign: 'right', opacity: 0.8 }}>{state}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
