export default function ProjectOverviewScreen() {
  return (
    <main style={{ minHeight: '100vh', background: '#08111b', color: '#d8e7f4', padding: 36, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 15, opacity: 0.7, letterSpacing: 1.2 }}>SSX • PROJECT OVERVIEW</div>
      <h1 style={{ margin: '10px 0 28px', fontSize: 34 }}>Live Project Status</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        <div style={{ border: '1px solid #29445b', padding: 24 }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>OVERALL COMPLETION</div>
          <div style={{ fontSize: 64, marginTop: 12 }}>64%</div>
          <div style={{ height: 12, background: '#132331', marginTop: 18 }}>
            <div style={{ width: '64%', height: '100%', background: '#4e8bc4' }} />
          </div>
        </div>
        <div style={{ border: '1px solid #29445b', padding: 24 }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>COST PERFORMANCE</div>
          <div style={{ fontSize: 44, marginTop: 12 }}>$2.31M</div>
          <div style={{ marginTop: 8, opacity: 0.78 }}>Under current budget target</div>
        </div>
      </section>
    </main>
  );
}
