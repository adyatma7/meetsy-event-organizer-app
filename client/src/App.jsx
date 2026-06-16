import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Pages — Admin
import Dashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/AdminLogin';

// Placeholder pages (will be implemented in later phases)
import EventList from './pages/admin/EventList';
import EventNew from './pages/admin/EventNew';
import EventDetail from './pages/admin/EventDetail';
import FormBuilder from './pages/admin/FormBuilder';
import EmailTemplateBuilder from './pages/admin/EmailTemplateBuilder';
import InvitePage from './pages/admin/InvitePage';
import ApprovePage from './pages/admin/ApprovePage';
import ReportPage from './pages/admin/ReportPage';
import DataManager from './pages/admin/DataManager';
import Settings from './pages/admin/Settings';

// Pages — Staff
import StaffLogin from './pages/staff/StaffLogin';
import Scanner from './pages/staff/Scanner';
import OnsiteReg from './pages/staff/OnsiteReg';

// Pages — Public
import Register from './pages/public/Register';
import RegisterDone from './pages/public/RegisterDone';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import StaffLayout from './components/layout/StaffLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public routes (no auth) --- */}
        <Route path="/register/:slug" element={<Register />} />
        <Route path="/register/:slug/done" element={<RegisterDone />} />

        {/* --- Staff routes (PIN auth) --- */}
        <Route path="/staff/:slug" element={<StaffLogin />} />
        <Route element={<StaffLayout />}>
          <Route path="/staff/:slug/scan" element={<Scanner />} />
          <Route path="/staff/:slug/onsite" element={<OnsiteReg />} />
        </Route>

        {/* --- Admin routes (JWT auth) --- */}
        <Route path="/login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/new" element={<EventNew />} />
          <Route path="/events/:id/edit" element={<EventNew />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/form" element={<FormBuilder />} />
          <Route path="/events/:id/emails" element={<EmailTemplateBuilder />} />
          <Route path="/events/:id/invite" element={<InvitePage />} />
          <Route path="/events/:id/approve" element={<ApprovePage />} />
          <Route path="/reports/:id" element={<ReportPage />} />
          <Route path="/data/manager" element={<DataManager />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
