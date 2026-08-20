import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './design-system.css';
import { AppProvider } from './store/AppContext.jsx';
import { DemoProvider } from './store/DemoContext.jsx';
import DemoBanner from './components/demo/DemoBanner.jsx';

import PresentationPage   from './pages/PresentationPage.jsx';
import AuthPage           from './pages/app/AuthPage.jsx';
import BookingBoardPage   from './pages/app/BookingBoardPage.jsx';
import CheckoutPage       from './pages/app/CheckoutPage.jsx';
import ConfirmPage        from './pages/app/ConfirmPage.jsx';
import MyBookingsPage     from './pages/app/MyBookingsPage.jsx';
import RecurringPage      from './pages/app/RecurringPage.jsx';
import MembershipPage     from './pages/app/MembershipPage.jsx';
import AdminDashboardPage from './pages/app/AdminDashboardPage.jsx';
import AppShell           from './components/layout/AppShell.jsx';

function AppRoutes() {
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<PresentationPage />} />
        {/* Auth is standalone — outside the protected shell */}
        <Route path="/app/auth" element={<AuthPage />} />
        {/* Protected shell wraps all authenticated app routes */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/book" replace />} />
          <Route path="book"        element={<BookingBoardPage />} />
          <Route path="checkout"    element={<CheckoutPage />} />
          <Route path="confirm"     element={<ConfirmPage />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="recurring"   element={<RecurringPage />} />
          <Route path="membership"  element={<MembershipPage />} />
          <Route path="admin"       element={<AdminDashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
