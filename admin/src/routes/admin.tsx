import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';

const AdminApp = lazy(() => import('@/admin/App'));

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'ETurismo Admin' },
      { name: 'description', content: 'ETurismo admin panel' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading admin panel…
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading admin panel…
        </div>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
