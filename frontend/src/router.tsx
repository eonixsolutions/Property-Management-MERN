import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@components/layout/AppLayout';
import { ProtectedRoute } from '@components/common/ProtectedRoute';

// Pages — lazy-loaded for better performance
import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('@pages/LandingPage'));
const LoginPage = lazy(() => import('@pages/LoginPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));

// Dashboard is eagerly imported — it's the first page after login, no loading flash
import DashboardPage from '@pages/DashboardPage';

// Protected pages (lazy-loaded, prefetched in AppLayout after mount)
const PropertiesPage = lazy(() => import('@pages/PropertiesPage'));
const TenantsPage = lazy(() => import('@pages/TenantsPage'));
const RentPage = lazy(() => import('@pages/RentPage'));
const TransactionsPage = lazy(() => import('@pages/TransactionsPage'));
const OwnersPage = lazy(() => import('@pages/OwnersPage'));
const ChequesPage = lazy(() => import('@pages/ChequesPage'));
const MaintenancePage = lazy(() => import('@pages/MaintenancePage'));
const MaintenanceDetailPage = lazy(() => import('@pages/MaintenanceDetailPage'));
const DocumentsPage = lazy(() => import('@pages/DocumentsPage'));
const AccountingPage = lazy(() => import('@pages/AccountingPage'));
const ReportsPage = lazy(() => import('@pages/ReportsPage'));
const PropertyDetailPage = lazy(() => import('@pages/PropertyDetailPage'));
const TenantDetailPage = lazy(() => import('@pages/TenantDetailPage'));
const UsersPage = lazy(() => import('@pages/UsersPage'));
const UserProfilePage = lazy(() => import('@pages/UserProfilePage'));
const NotificationsPage = lazy(() => import('@pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const ContractsPage = lazy(() => import('@pages/ContractsPage'));
const ListingsPage = lazy(() => import('@pages/ListingsPage'));

function PageLoader() {
  return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading…</div>;
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    path: '/',
    element: withSuspense(LandingPage),
  },
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/listings',
    element: withSuspense(ListingsPage),
  },

  // ── Protected routes (wrapped in AppLayout + ProtectedRoute) ───────────────
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: withSuspense(DashboardPage) },
      { path: 'properties', element: withSuspense(PropertiesPage) },
      { path: 'properties/:id', element: withSuspense(PropertyDetailPage) },
      { path: 'tenants', element: withSuspense(TenantsPage) },
      { path: 'tenants/:id', element: withSuspense(TenantDetailPage) },
      { path: 'rent', element: withSuspense(RentPage) },
      { path: 'transactions', element: withSuspense(TransactionsPage) },
      { path: 'owners', element: withSuspense(OwnersPage) },
      { path: 'cheques', element: withSuspense(ChequesPage) },
      { path: 'maintenance', element: withSuspense(MaintenancePage) },
      { path: 'maintenance/:id', element: withSuspense(MaintenanceDetailPage) },
      { path: 'documents', element: withSuspense(DocumentsPage) },
      { path: 'accounting', element: withSuspense(AccountingPage) },
      { path: 'reports', element: withSuspense(ReportsPage) },
      { path: 'contracts', element: withSuspense(ContractsPage) },
      { path: 'users', element: withSuspense(UsersPage) },
      { path: 'users/:id', element: withSuspense(UserProfilePage) },
      { path: 'notifications', element: withSuspense(NotificationsPage) },
      { path: 'settings', element: withSuspense(SettingsPage) },
    ],
  },

  // ── Catch-all ──────────────────────────────────────────────────────────────
  {
    path: '*',
    element: withSuspense(NotFoundPage),
  },
]);
