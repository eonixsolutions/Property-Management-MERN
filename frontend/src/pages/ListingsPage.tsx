import { useState, useEffect, useRef, useCallback } from 'react';
import { listingsApi } from '@api/listings.api';
import type { ApiListing, ListingsFilter } from '@api/listings.api';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_ORIGIN = import.meta.env.VITE_API_URL.replace('/api', '');

const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Studio',
  'Townhouse',
  'Office',
  'Shop',
  'Warehouse',
  'Land',
  'Other',
];

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  // Top navigation bar
  navbar: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: '0 1.5rem',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  navBrand: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#fff',
    textDecoration: 'none' as const,
  },
  navLogin: {
    padding: '0.4rem 0.9rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    textDecoration: 'none' as const,
  },
  // Hero section
  hero: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: '3rem 1.5rem 2rem',
    textAlign: 'center' as const,
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
  },
  heroSub: {
    fontSize: '1rem',
    color: '#94a3b8',
    margin: '0 0 2rem',
  },
  // Search bar
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    alignItems: 'flex-end',
    maxWidth: '900px',
    margin: '0 auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  searchField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    flex: '1 1 160px',
  },
  searchLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
  },
  searchInput: {
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  searchBtn: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-end' as const,
    flexShrink: 0,
  },
  // Content area
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  resultsCount: {
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  // Property card grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  // Image area
  imgWrapper: {
    position: 'relative' as const,
    height: '200px',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    flexShrink: 0,
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    color: '#9ca3af',
  },
  typeBadge: {
    position: 'absolute' as const,
    top: '0.6rem',
    left: '0.6rem',
    backgroundColor: 'rgba(26,26,46,0.85)',
    color: '#fff',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  // Image carousel controls
  carouselBtn: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  // Card body
  cardBody: {
    padding: '1rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 0.3rem',
  },
  cardLocation: {
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: '0 0 0.75rem',
  },
  specs: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  specItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: '#4b5563',
  },
  rent: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '0.75rem',
    marginTop: 'auto' as const,
  },
  rentSub: {
    fontSize: '0.75rem',
    fontWeight: 400,
    color: '#6b7280',
  },
  // Action buttons
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #f3f4f6',
    marginTop: '0.25rem',
  },
  waBtn: {
    flex: 1,
    padding: '0.45rem 0.5rem',
    backgroundColor: '#25d366',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none' as const,
    textAlign: 'center' as const,
  },
  callBtn: {
    flex: 1,
    padding: '0.45rem 0.5rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none' as const,
    textAlign: 'center' as const,
  },
  shareBtn: {
    padding: '0.45rem 0.6rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  noResults: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
    color: '#6b7280',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '4rem 1rem',
    color: '#6b7280',
  },
  footer: {
    backgroundColor: '#1a1a2e',
    color: '#94a3b8',
    textAlign: 'center' as const,
    padding: '1.5rem',
    fontSize: '0.8rem',
    marginTop: '4rem',
  },
};

// ── Property Card ──────────────────────────────────────────────────────────────

function PropertyCard({ listing }: { listing: ApiListing }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const images = [
    ...(listing.primaryImage ? [listing.primaryImage] : []),
    ...listing.allImages.filter((u) => u !== listing.primaryImage),
  ].filter(Boolean);

  const currentImg = images[imgIdx];
  const imgSrc = currentImg ? `${API_ORIGIN}${currentImg}` : null;

  const prevImg = () => setImgIdx((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIdx((i) => (i + 1) % images.length);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.propertyName, url });
      } catch {
        // user cancelled or share not available
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard not available
      }
    }
  };

  const phone = listing.contactNumber?.replace(/\D/g, '');

  return (
    <div style={s.card}>
      {/* Image */}
      <div style={s.imgWrapper}>
        {imgSrc ? (
          <img src={imgSrc} alt={listing.propertyName} style={s.img} />
        ) : (
          <div style={s.imgPlaceholder}>🏢</div>
        )}
        {listing.propertyType && <div style={s.typeBadge}>{listing.propertyType}</div>}
        {images.length > 1 && (
          <>
            <button style={{ ...s.carouselBtn, left: '0.4rem' }} onClick={prevImg}>
              ‹
            </button>
            <button style={{ ...s.carouselBtn, right: '0.4rem' }} onClick={nextImg}>
              ›
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={s.cardBody}>
        <h3 style={s.cardTitle}>{listing.propertyName}</h3>
        <p style={s.cardLocation}>
          📍{' '}
          {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') || 'Location not specified'}
        </p>

        {/* Specs */}
        <div style={s.specs}>
          {listing.bedrooms !== undefined && (
            <span style={s.specItem}>🛏 {listing.bedrooms} bed</span>
          )}
          {listing.bathrooms !== undefined && (
            <span style={s.specItem}>🚿 {listing.bathrooms} bath</span>
          )}
          {listing.squareFeet !== undefined && (
            <span style={s.specItem}>📐 {listing.squareFeet.toLocaleString()} sqft</span>
          )}
        </div>

        {/* Rent */}
        {listing.defaultRent !== undefined && (
          <div style={s.rent}>
            QAR {listing.defaultRent.toLocaleString()}{' '}
            <span style={s.rentSub}>/month</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={s.cardActions}>
          {phone ? (
            <>
              <a
                href={`https://wa.me/974${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={s.waBtn}
              >
                WhatsApp
              </a>
              <a href={`tel:${listing.contactNumber}`} style={s.callBtn}>
                Call
              </a>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', flex: 1 }}>
              Contact not available
            </span>
          )}
          <button style={s.shareBtn} onClick={() => void handleShare()}>
            {copied ? '✓ Copied' : '⎘ Share'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ListingsPage() {
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter state (controlled by form fields)
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');

  // Applied filters (submitted by user)
  const [applied, setApplied] = useState<ListingsFilter>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchListings = useCallback(async (filters: ListingsFilter) => {
    setLoading(true);
    try {
      const result = await listingsApi.getListings(filters);
      setListings(result.listings);
      setTotal(result.total);
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when applied filters change
  useEffect(() => {
    void fetchListings(applied);
  }, [applied, fetchListings]);

  // Debounce search input for live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setApplied((prev) => ({ ...prev, search: search || undefined }));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: ListingsFilter = {
      search: search || undefined,
      type: type || undefined,
      city: city || undefined,
      minRent: minRent ? Number(minRent) : undefined,
      maxRent: maxRent ? Number(maxRent) : undefined,
    };
    setApplied(filters);
  };

  const handleReset = () => {
    setSearch('');
    setType('');
    setCity('');
    setMinRent('');
    setMaxRent('');
    setApplied({});
  };

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.navbar}>
        <span style={s.navBrand}>Property Management</span>
        <a href="/login" style={s.navLogin}>
          Admin Login
        </a>
      </nav>

      {/* Hero & Search */}
      <div style={s.hero}>
        <h1 style={s.heroTitle}>Find Your Perfect Home</h1>
        <p style={s.heroSub}>Browse available properties for rent</p>

        <form style={s.searchBar} onSubmit={handleSubmit}>
          <div style={s.searchField}>
            <span style={s.searchLabel}>Search</span>
            <input
              style={s.searchInput}
              type="text"
              placeholder="Name, address, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={s.searchField}>
            <span style={s.searchLabel}>Type</span>
            <select
              style={s.searchInput}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div style={s.searchField}>
            <span style={s.searchLabel}>City</span>
            <input
              style={s.searchInput}
              type="text"
              placeholder="e.g. Doha"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div style={{ ...s.searchField, flex: '0 1 110px' }}>
            <span style={s.searchLabel}>Min Rent</span>
            <input
              style={s.searchInput}
              type="number"
              placeholder="QAR"
              min={0}
              value={minRent}
              onChange={(e) => setMinRent(e.target.value)}
            />
          </div>
          <div style={{ ...s.searchField, flex: '0 1 110px' }}>
            <span style={s.searchLabel}>Max Rent</span>
            <input
              style={s.searchInput}
              type="number"
              placeholder="QAR"
              min={0}
              value={maxRent}
              onChange={(e) => setMaxRent(e.target.value)}
            />
          </div>
          <button type="submit" style={s.searchBtn}>
            Search
          </button>
          <button
            type="button"
            style={{ ...s.searchBtn, backgroundColor: '#6b7280' }}
            onClick={handleReset}
          >
            Reset
          </button>
        </form>
      </div>

      {/* Listings */}
      <div style={s.content}>
        <div style={s.resultsHeader}>
          <p style={s.resultsCount}>
            {loading ? 'Searching…' : `${total} propert${total === 1 ? 'y' : 'ies'} available`}
          </p>
        </div>

        {loading ? (
          <div style={s.loading}>
            <p>Loading properties…</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={s.noResults}>
            <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏠</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No properties found
            </p>
            <p>Try adjusting your search filters.</p>
            {Object.keys(applied).length > 0 && (
              <button
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#4f8ef7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={handleReset}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={s.grid}>
            {listings.map((listing) => (
              <PropertyCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <p>© {new Date().getFullYear()} Property Management. All rights reserved.</p>
      </footer>
    </div>
  );
}
