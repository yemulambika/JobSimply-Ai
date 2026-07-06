import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import JobsPage from '../pages/JobsPage';
import ResumePage from '../pages/ResumePage';
import AtsPage from '../pages/AtsPage';
import TailorPage from '../pages/TailorPage';
import TailoredJobPage from '../pages/TailoredJobPage';
import CoverLetterPage from '../pages/CoverLetterPage';
import EmailPage from '../pages/EmailPage';
import ApplicationsPage from '../pages/ApplicationsPage';
import SettingsPage from '../pages/SettingsPage';
import AdminPage from '../pages/AdminPage';
import SavedJobsPage from '../pages/SavedJobsPage';
import InterviewPage from '../pages/InterviewPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        {/* Job comparison page - /jobs/:id (Jobright-style) */}
        <Route path="jobs/:jobId" element={<TailoredJobPage />} />
        {/* Legacy route still works */}
        <Route path="dashboard/jobs/:jobId" element={<TailoredJobPage />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="ats" element={<AtsPage />} />
        <Route path="tailor" element={<TailorPage />} />
        <Route path="cover-letter" element={<CoverLetterPage />} />
        <Route path="email" element={<EmailPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="interview" element={<InterviewPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}