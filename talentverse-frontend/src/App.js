import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import AuthGate from "./pages/AuthGate";

// Public
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";

// Core
import DashboardPage from "./pages/DashboardPage";
import UserProfile from "./pages/UserProfile";
import AnalysisPage from "./pages/AnalysisPage";
import LearningPlanPage from "./pages/LearningPlanPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import MatchingPage from "./pages/MatchingPage";
import AICoachPage from "./pages/AICoachPage";
import CollaborationRoom from "./pages/CollaborationRoom";

// New
import CoursesPage from "./pages/CoursesPage";
import CoachApplyPage from "./pages/CoachApplyPage";

// Big Five
import BigFivePage from "./pages/BigFivePage";
import BigFiveResultsPage from "./pages/BigFiveResultsPage";

// Optional legacy
import MBTIPage from "./pages/MBTIPage";
import MBTIAnalysisPage from "./pages/MBTIAnalysisPage";

const TestLayout = ({ children }) => (
  <div className="min-h-screen bg-[#060318] text-white">{children}</div>
);

const Protected = ({ children }) => (
  <AuthGate>
    <MainLayout>{children}</MainLayout>
  </AuthGate>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Required Onboarding */}
        <Route
          path="/big5"
          element={
            <AuthGate>
              <TestLayout>
                <BigFivePage />
              </TestLayout>
            </AuthGate>
          }
        />
        <Route path="/big5-results" element={<Protected><BigFiveResultsPage /></Protected>} />

        {/* Main (Protected) */}
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/profile" element={<Protected><UserProfile /></Protected>} />
        <Route path="/analysis" element={<Protected><AnalysisPage /></Protected>} />
        <Route path="/learning-plan" element={<Protected><LearningPlanPage /></Protected>} />
        <Route path="/projects" element={<Protected><ProjectsPage /></Protected>} />
        <Route path="/project/:id" element={<Protected><ProjectDetailsPage /></Protected>} />
        <Route path="/matching" element={<Protected><MatchingPage /></Protected>} />
        <Route path="/ai-coach" element={<Protected><AICoachPage /></Protected>} />
        <Route path="/collaboration" element={<Protected><CollaborationRoom /></Protected>} />

        {/* New pages */}
        <Route path="/courses" element={<Protected><CoursesPage /></Protected>} />
        <Route path="/coach-apply" element={<Protected><CoachApplyPage /></Protected>} />

        {/* Optional MBTI */}
        <Route
          path="/mbti"
          element={
            <AuthGate>
              <TestLayout>
                <MBTIPage />
              </TestLayout>
            </AuthGate>
          }
        />
        <Route path="/mbti-analysis" element={<Protected><MBTIAnalysisPage /></Protected>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
