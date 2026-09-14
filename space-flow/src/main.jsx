import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './design-system.css';
import { AppProvider, useApp } from './store/SpaceFlowContext.jsx';
import { DemoProvider } from './store/DemoContext.jsx';

import PresentationPage     from './pages/PresentationPage.jsx';
import AuthPage             from './pages/app/AuthPage.jsx';
import AppShell             from './components/layout/AppShell.jsx';
import ExploreSpacesPage    from './pages/app/ExploreSpacesPage.jsx';
import BookingFlowPage      from './pages/app/BookingFlowPage.jsx';
import CheckoutPage         from './pages/app/CheckoutPage.jsx';
import ConfirmPage          from './pages/app/ConfirmPage.jsx';
import MyBookingsPage       from './pages/app/MyBookingsPage.jsx';
import AdminFacilitiesPage  from './pages/app/AdminFacilitiesPage.jsx';
import AdminBookingsPage    from './pages/app/AdminBookingsPage.jsx';
import AdminCalendarPage    from './pages/app/AdminCalendarPage.jsx';
import AdminAnalyticsPage   from './pages/app/AdminAnalyticsPage.jsx';
import LayoutGeneratorPage  from './pages/app/LayoutGeneratorPage.jsx';

function AppIndex() {
  const { session } = useApp();
  if (session?.role === 'admin' || session?.role === 'staff') {
    return <Navigate to="/app/admin-calendar" replace />;
  }
  return <Navigate to="/app/book" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<PresentationPage />} />
      <Route path="/app/auth"  element={<AuthPage />} />
      <Route path="/app"       element={<AppShell />}>
        <Route index                   element={<AppIndex />} />
        <Route path="book"             element={<ExploreSpacesPage />} />
        <Route path="book-flow"        element={<BookingFlowPage />} />
        <Route path="checkout"         element={<CheckoutPage />} />
        <Route path="confirm"          element={<ConfirmPage />} />
        <Route path="my-bookings"      element={<MyBookingsPage />} />
        <Route path="admin-calendar"   element={<AdminCalendarPage />} />
        <Route path="admin-bookings"   element={<AdminBookingsPage />} />
        <Route path="admin-facilities" element={<AdminFacilitiesPage />} />
        <Route path="admin-analytics"  element={<AdminAnalyticsPage />} />
        <Route path="layout"           element={<LayoutGeneratorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <HashRouter>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </HashRouter>
    </AppProvider>
  </React.StrictMode>
);
