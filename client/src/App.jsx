import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'
import { HistoryDetailPage, HistoryPage } from './pages/HistoryPages.jsx'
import InterviewPrepPage from './pages/InterviewPrepPage.jsx'
import JobSuggestionsPage from './pages/JobSuggestionsPage.jsx'
import {
  NewAnalysisPage,
  ProfilePage,
} from './pages/DashboardPages.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import './Auth.css'

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="new-analysis" element={<NewAnalysisPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:analysisId" element={<HistoryDetailPage />} />
                <Route path="interview-prep" element={<InterviewPrepPage />} />
                <Route path="job-suggestions" element={<JobSuggestionsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
