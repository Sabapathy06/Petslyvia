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

function AppRoutes() {
  return (
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
        <Route index element={<WorldMapPage />} />
        <Route path="sanctuary" element={<PetHomePage />} />
        <Route path="forest" element={<AdventurePage />} />
        <Route path="dungeon" element={<BugDungeonPage />} />
        <Route path="city" element={<SmartCityPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="creator" element={<CreatorPage />} />
        <Route path="multiplayer" element={<MultiplayerPage />} />
        <Route path="lab" element={<CodingLabPage />} />
        <Route path="quantum" element={<CodingLabPage />} />
        <Route path="quantum-lab" element={<CodingLabPage />} />
        <Route path="quantumlab" element={<CodingLabPage />} />
        <Route path="skills" element={<AchievementsSkillsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
