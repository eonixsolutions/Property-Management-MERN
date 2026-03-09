import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },

  // ── Navbar ──
  navbar: {
    backgroundColor: '#0f172a',
    padding: '0 2rem',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    textDecoration: 'none',
  },
  navLogo: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
  navTitle: {
    color: '#f1f5f9',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '-0.01em',
  },
  navSubtitle: {
    color: '#64748b',
    fontSize: '0.72rem',
    marginTop: '-2px',
  },
  navActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  loginBtn: {
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  ctaNavBtn: {
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
  },

  // ── Hero ──
  hero: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
    padding: '6rem 2rem 5rem',
    textAlign: 'center' as const,
  },
  heroBadge: {
    display: 'inline-block',
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    backgroundColor: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.3)',
    color: '#93c5fd',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '1.5rem',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 800,
    color: '#f1f5f9',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    marginBottom: '1.25rem',
    maxWidth: '700px',
    margin: '0 auto 1.25rem',
  },
  heroAccent: {
    color: '#60a5fa',
  },
  heroSub: {
    fontSize: '1.1rem',
    color: '#94a3b8',
    maxWidth: '520px',
    margin: '0 auto 2.5rem',
    lineHeight: 1.7,
  },
  heroBtns: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  heroPrimaryBtn: {
    padding: '0.85rem 2rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
  },
  heroSecondaryBtn: {
    padding: '0.85rem 2rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },

  // ── Stats bar ──
  statsBar: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'center',
    gap: '0',
    flexWrap: 'wrap' as const,
  },
  statItem: {
    padding: '1.5rem 3rem',
    textAlign: 'center' as const,
    borderRight: '1px solid #f1f5f9',
  },
  statNum: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#1e40af',
    lineHeight: 1,
    marginBottom: '0.3rem',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },

  // ── Section ──
  section: {
    padding: '5rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTag: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#3b82f6',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '0.6rem',
  },
  sectionTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
    marginBottom: '0.75rem',
    lineHeight: 1.2,
  },
  sectionSub: {
    color: '#64748b',
    fontSize: '1rem',
    lineHeight: 1.7,
    maxWidth: '520px',
    marginBottom: '3rem',
  },

  // ── Feature grid ──
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  featureCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.75rem',
    transition: 'box-shadow 0.2s',
  },
  featureIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    fontSize: '1.25rem',
  },
  featureTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '0.5rem',
  },
  featureDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.6,
  },

  // ── Workflow ──
  workflowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  workflowStep: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  stepNum: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    border: '2px solid #bfdbfe',
    color: '#1d4ed8',
    fontWeight: 800,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: '0.83rem',
    color: '#64748b',
    lineHeight: 1.55,
  },

  // ── CTA band ──
  ctaBand: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    padding: '5rem 2rem',
    textAlign: 'center' as const,
  },
  ctaTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  ctaSub: {
    color: '#bfdbfe',
    fontSize: '1rem',
    marginBottom: '2rem',
    lineHeight: 1.7,
  },

  // ── Footer ──
  footer: {
    backgroundColor: '#0f172a',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  footerBrand: {
    color: '#475569',
    fontSize: '0.85rem',
  },
  footerLinks: {
    display: 'flex',
    gap: '1.5rem',
  },
  footerLink: {
    color: '#475569',
    fontSize: '0.85rem',
    textDecoration: 'none',
  },
};

// ── Feature data ──────────────────────────────────────────────────────────────

const features = [
  {
    icon: '🏢',
    bg: '#eff6ff',
    title: 'Property & Unit Management',
    desc: 'Manage master buildings and individual units with status tracking, occupancy rates, and owner information in one place.',
  },
  {
    icon: '👥',
    bg: '#f0fdf4',
    title: 'Tenant Lifecycle',
    desc: 'Full tenant management from onboarding to move-out. Track lease terms, contacts, and auto-generate monthly rent invoices.',
  },
  {
    icon: '💳',
    bg: '#fefce8',
    title: 'Rent & Payment Tracking',
    desc: 'Automated rent invoices, overdue detection, payment history, and cheque management for both tenants and property owners.',
  },
  {
    icon: '🔧',
    bg: '#fdf4ff',
    title: 'Maintenance Requests',
    desc: 'Log and track maintenance requests by priority (Emergency → Low) with cost tracking and assignment workflows.',
  },
  {
    icon: '📊',
    bg: '#fff7ed',
    title: 'Financial Dashboard',
    desc: '12-month cashflow charts, income vs expense summaries, occupancy rates, and real-time KPIs at a glance.',
  },
  {
    icon: '📄',
    bg: '#f0f9ff',
    title: 'Contracts & Documents',
    desc: 'Generate professional lease contracts, manage uploads, and store all documents securely with tenant and property linking.',
  },
  {
    icon: '📈',
    bg: '#fdf2f8',
    title: 'Reports & Accounting',
    desc: 'P&L statements, balance sheets, trial balance, and per-property performance reports with date-range filtering.',
  },
  {
    icon: '🔔',
    bg: '#ecfdf5',
    title: 'Smart Notifications',
    desc: 'Never miss overdue rent, expiring leases, upcoming cheques, or pending maintenance with a live notification centre.',
  },
];

const steps = [
  { n: '1', title: 'Add Your Properties', desc: 'Create master buildings and units, set owner details, pricing, and property type.' },
  { n: '2', title: 'Onboard Tenants', desc: 'Register tenants, set lease dates, rent amount, and auto-generate monthly invoices.' },
  { n: '3', title: 'Track Payments', desc: 'Record cheques, mark payments received, and auto-flag overdue accounts.' },
  { n: '4', title: 'Monitor & Report', desc: 'View the dashboard for live KPIs, generate reports, and manage maintenance requests.' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // If already logged in, go straight to the dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>;
  }

  return (
    <div style={s.page}>
      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navBrand}>
          <div style={s.navLogo}>P</div>
          <div>
            <div style={s.navTitle}>PropManager</div>
            <div style={s.navSubtitle}>Qatar Property Management</div>
          </div>
        </div>
        <div style={s.navActions}>
          <Link to="/listings" style={s.loginBtn}>Public Listings</Link>
          <Link to="/login" style={s.ctaNavBtn}>Login</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroBadge}>Qatar Property Management Platform</div>
        <h1 style={s.heroTitle}>
          Manage Every Property,<br />
          <span style={s.heroAccent}>Payment & Tenant</span>
        </h1>
        <p style={s.heroSub}>
          A complete property management system for landlords and property managers in Qatar.
          Track rent, cheques, maintenance, and financials — all in one dashboard.
        </p>
        <div style={s.heroBtns}>
          <Link to="/login" style={s.heroPrimaryBtn}>Get Started →</Link>
          <Link to="/listings" style={s.heroSecondaryBtn}>View Listings</Link>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={s.statsBar}>
        {[
          { n: '7+', label: 'Property Types' },
          { n: '360°', label: 'Financial View' },
          { n: 'Auto', label: 'Rent Invoicing' },
          { n: 'Live', label: 'Notifications' },
        ].map((stat) => (
          <div key={stat.label} style={s.statItem}>
            <div style={s.statNum}>{stat.n}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div style={s.section}>
        <div style={s.sectionTag}>Everything You Need</div>
        <h2 style={s.sectionTitle}>A Full Property Management Suite</h2>
        <p style={s.sectionSub}>
          From the first tenant inquiry to the final owner settlement — every workflow is covered.
        </p>
        <div style={s.featureGrid}>
          {features.map((f) => (
            <div key={f.title} style={s.featureCard}>
              <div style={{ ...s.featureIcon, backgroundColor: f.bg }}>{f.icon}</div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ── */}
      <div style={{ backgroundColor: '#f8fafc', padding: '5rem 2rem' }}>
        <div style={{ ...s.section, padding: 0, maxWidth: '1200px', margin: '0 auto' }}>
          <div style={s.sectionTag}>How It Works</div>
          <h2 style={s.sectionTitle}>Up and Running in Minutes</h2>
          <p style={s.sectionSub}>Four simple steps to get your entire portfolio under control.</p>
          <div style={s.workflowGrid}>
            {steps.map((step) => (
              <div key={step.n} style={s.workflowStep}>
                <div style={s.stepNum}>{step.n}</div>
                <div>
                  <div style={s.stepTitle}>{step.title}</div>
                  <div style={s.stepDesc}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA band ── */}
      <div style={s.ctaBand}>
        <h2 style={s.ctaTitle}>Ready to Take Control of Your Portfolio?</h2>
        <p style={s.ctaSub}>Log in to your account to access the full dashboard and all management tools.</p>
        <Link to="/login" style={s.heroPrimaryBtn}>Login to Dashboard →</Link>
      </div>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>© 2026 PropManager · Qatar Property Management System</div>
        <div style={s.footerLinks}>
          <Link to="/listings" style={s.footerLink}>Public Listings</Link>
          <Link to="/login" style={s.footerLink}>Login</Link>
        </div>
      </footer>
    </div>
  );
}
