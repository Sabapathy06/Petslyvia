import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { GameDataProvider } from '@/hooks/useGameData';
import { LandingPage } from '@/pages/LandingPage';
import { SignupPage, LoginPage, ResetPasswordPage } from '@/pages/AuthPages';
import { GameLayout } from '@/layouts/GameLayout';
import { WorldMapPage } from '@/pages/WorldMapPage';
import { PetHomePage } from '@/pages/PetHomePage';
import { AdventurePage } from '@/pages/AdventurePage';
import { BugDungeonPage } from '@/pages/BugDungeonPage';
import { SmartCityPage } from '@/pages/SmartCityPage';
import { ShopPage } from '@/pages/ShopPage';
import { CreatorPage } from '@/pages/CreatorPage';
import { MultiplayerPage } from '@/pages/MultiplayerPage';
import { CodingLabPage } from '@/pages/CodingLabPage';
import { AchievementsSkillsPage } from '@/pages/AchievementsSkillsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { JSX } from 'react';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f8f5] flex items-center justify-center">
        <div className="border-4 border-[#e2ece5] border-t-[#2d6a4f] rounded-full w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f8f5] flex items-center justify-center">
        <div className="border-4 border-[#e2ece5] border-t-[#2d6a4f] rounded-full w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/app" replace />;
  return children;
}

import { ErrorBoundary } from '@/components/ErrorBoundary';

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/reset" element={<ResetPasswordPage />} />

        {/* Main Authenticated Petslyvia Adventure World */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <GameDataProvider>
                <GameLayout />
              </GameDataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<ErrorBoundary><WorldMapPage /></ErrorBoundary>} />
          <Route path="sanctuary" element={<ErrorBoundary><PetHomePage /></ErrorBoundary>} />
          <Route path="forest" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="logic" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="logic-forest" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="logic_forest" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="forest-of-logic" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="forest_of_logic" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="adventure" element={<ErrorBoundary><AdventurePage /></ErrorBoundary>} />
          <Route path="dungeon" element={<ErrorBoundary><BugDungeonPage /></ErrorBoundary>} />
          <Route path="city" element={<ErrorBoundary><SmartCityPage /></ErrorBoundary>} />
          <Route path="shop" element={<ErrorBoundary><ShopPage /></ErrorBoundary>} />
          <Route path="creator" element={<ErrorBoundary><CreatorPage /></ErrorBoundary>} />
          <Route path="multiplayer" element={<ErrorBoundary><MultiplayerPage /></ErrorBoundary>} />
          <Route path="lab" element={<ErrorBoundary><CodingLabPage /></ErrorBoundary>} />
          <Route path="quantum" element={<ErrorBoundary><CodingLabPage /></ErrorBoundary>} />
          <Route path="quantum-lab" element={<ErrorBoundary><CodingLabPage /></ErrorBoundary>} />
          <Route path="quantumlab" element={<ErrorBoundary><CodingLabPage /></ErrorBoundary>} />
          <Route path="skills" element={<ErrorBoundary><AchievementsSkillsPage /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
