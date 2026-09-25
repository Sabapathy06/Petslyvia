import { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, Home, Compass, Bug, Building2, ShoppingBag,
  Sparkles, Users, Award, Code2, LogOut, Volume2, VolumeX, Menu, X,
  Settings, SlidersHorizontal, Lock, CheckCircle2, ChevronRight, Wand2, GraduationCap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { Taskbar } from '@/components/Taskbar';
import { SettingsModal } from '@/components/SettingsModal';
import { sound } from '@/utils/audio';
import { generateFriendId } from '@/services/friendService';

interface JourneyStep {
  id: string;
  stepNumber: number;
  label: string;
  to: string;
  areaKey: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  { id: 'step_academy', stepNumber: 1, label: 'Coding Academy', to: '/app/academy', areaKey: 'all' },
  { id: 'step_1', stepNumber: 2, label: 'First steps', to: '/app/first-steps', areaKey: 'logic_forest' },
  { id: 'step_2', stepNumber: 3, label: 'Hidden magic', to: '/app/sanctuary', areaKey: 'pet_home' },
  { id: 'step_3', stepNumber: 4, label: 'Forest of logic', to: '/app/forest', areaKey: 'logic_forest' },
  { id: 'step_4', stepNumber: 5, label: 'Bug dungeon', to: '/app/dungeon', areaKey: 'bug_dungeon' },
  { id: 'step_5', stepNumber: 6, label: 'Smart city', to: '/app/city', areaKey: 'smart_city' },
  { id: 'step_6', stepNumber: 7, label: 'Quantum lab', to: '/app/lab', areaKey: 'all' },
  { id: 'step_7', stepNumber: 8, label: 'Creator island', to: '/app/creator', areaKey: 'creator_world' },
];

export function GameLayout() {
  const { user, logout } = useAuth();
  const { profile, pet, soundEnabled, toggleSound, setPlayerRole } = useGameData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleLogout = async () => {
    sound.playClick();
    await logout();
    navigate('/login');
  };

  // Determine active breadcrumb based on current path
  const getBreadcrumbTitle = () => {
    const p = location.pathname;
    if (p.includes('/academy')) return 'Coding Academy';
    if (p.includes('/first-steps') || p.includes('/first_steps')) return 'First Steps';
    if (p.includes('/forest') || p.includes('/logic') || p.includes('/adventure')) return 'Forest of Logic';
    if (p.includes('/sanctuary')) return 'Pet Sanctuary';
    if (p.includes('/dungeon')) return 'Bug Dungeon';
    if (p.includes('/city')) return 'Smart City';
    if (p.includes('/shop')) return 'Bazaar Shop';
    if (p.includes('/creator')) return 'Creator Island';
    if (p.includes('/multiplayer')) return 'Bug Exchange';
    if (p.includes('/lab') || p.includes('/quantum')) return 'Quantum Lab';
    if (p.includes('/skills')) return 'Skills & Badges';
    if (p.includes('/settings')) return 'Settings';
    return 'World Map';
  };

  return (
    <div className="min-h-screen bg-[#f4f8f5] text-[#1b382b] flex flex-col md:flex-row font-sans selection:bg-[#2d6a4f] selection:text-white antialiased">
      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-[#e2ece5] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* Logo icon dots */}
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a2b]"></span>
            <span className="w-2 h-2 rounded-full bg-[#3d7a5a]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6ba887]"></span>
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#1e3a2b]">petslyvia.</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#eaf2ec] px-2.5 py-1 rounded-full text-xs font-semibold text-[#1e3a2b]">
            <Sparkles size={13} className="text-amber-600" /> {profile?.total_xp ?? 50} XP
          </div>
          <div className="flex items-center gap-1 bg-[#eaf2ec] px-2 py-1 rounded-full text-xs font-semibold text-[#1e3a2b]">
            💎 {profile?.coins ?? 0}
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-[#eaf2ec] text-[#1e3a2b] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Left Sidebar Navigation HUD */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e2ece5] flex flex-col justify-between transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* Brand Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#f0f5f1]">
            <Link
              to="/app"
              onClick={() => setMobileOpen(false)}
              className="group block"
            >
              <div className="flex items-center gap-2">
                {/* Petslyvia playful 3-dot pebble logo */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#1e3a2b] group-hover:scale-110 transition-transform"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2e6849] group-hover:scale-110 transition-transform"></div>
                  <div className="w-2 h-2 rounded-full bg-[#52936f] group-hover:scale-110 transition-transform"></div>
                </div>
                <span className="font-black text-2xl tracking-tight text-[#1e3a2b]">
                  petslyvia<span className="text-[#2d6a4f]">.</span>
                </span>
              </div>
              <span className="text-[9px] text-[#7a9386] font-bold tracking-[0.18em] uppercase mt-1.5 block">
                A LITTLE PLAY. A LOT OF POSSIBILITY.
              </span>
            </Link>
          </div>

          {/* Quick Action Top Menu */}
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/app/academy"
              onClick={() => {
                sound.playClick();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                location.pathname.includes('/academy')
                  ? 'bg-[#eaf2ec] text-[#1e3a2b] font-bold'
                  : 'text-[#5b7566] hover:text-[#1e3a2b] hover:bg-[#f4f8f5]'
              }`}
            >
              <GraduationCap size={16} className="text-[#2d6a4f]" />
              <span>Coding academy</span>
            </Link>

            <Link
              to="/app/multiplayer"
              onClick={() => {
                sound.playClick();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                location.pathname.includes('/multiplayer')
                  ? 'bg-[#eaf2ec] text-[#1e3a2b] font-bold'
                  : 'text-[#5b7566] hover:text-[#1e3a2b] hover:bg-[#f4f8f5]'
              }`}
            >
              <Bug size={16} className="text-[#5b7566]" />
              <span>Multiplayer Arena</span>
            </Link>

            <Link
              to="/app/friends"
              onClick={() => {
                sound.playClick();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                location.pathname.includes('/friends')
                  ? 'bg-[#eaf2ec] text-[#1e3a2b] font-bold'
                  : 'text-[#5b7566] hover:text-[#1e3a2b] hover:bg-[#f4f8f5]'
              }`}
            >
              <Users size={16} className="text-[#5b7566]" />
              <span>Friends & Social</span>
            </Link>

            <Link
              to="/app/creator"
              onClick={() => {
                sound.playClick();
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                location.pathname.includes('/creator')
                  ? 'bg-[#eaf2ec] text-[#1e3a2b] font-bold'
                  : 'text-[#5b7566] hover:text-[#1e3a2b] hover:bg-[#f4f8f5]'
              }`}
            >
              <Wand2 size={16} className="text-[#5b7566]" />
              <span>Creator island</span>
            </Link>
          </div>

          {/* YOUR JOURNEY Section */}
          <div className="px-4 pt-3 pb-2 flex-1">
            <div className="flex items-center justify-between px-3 py-2 text-[#7a9386]">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase">
                YOUR JOURNEY
              </span>
              <Link
                to="/app"
                title="View World Map"
                className="hover:text-[#1e3a2b] transition-colors p-1 rounded-md"
              >
                <Map size={14} />
              </Link>
            </div>

            <div className="space-y-1 mt-1">
              {JOURNEY_STEPS.map((step) => {
                const isActive =
                  location.pathname === step.to ||
                  (step.to === '/app/first-steps' &&
                    (location.pathname === '/app/first-steps' || location.pathname === '/app/first_steps')) ||
                  (step.to === '/app/forest' &&
                    (location.pathname === '/app/forest' ||
                      location.pathname === '/app/logic' ||
                      location.pathname === '/app/logic-forest' ||
                      location.pathname === '/app/forest-of-logic' ||
                      location.pathname === '/app/adventure')) ||
                  (step.to !== '/app' &&
                    step.to !== '/app/forest' &&
                    step.to !== '/app/first-steps' &&
                    location.pathname.startsWith(step.to));

                const isUnlocked =
                  step.areaKey === 'all' ||
                  step.stepNumber <= 3 ||
                  (profile?.unlocked_areas && profile.unlocked_areas.includes(step.areaKey));

                return (
                  <Link
                    key={step.id}
                    to={step.to}
                    onClick={() => {
                      sound.playClick();
                      setMobileOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-[#eaf2ec] text-[#1e3a2b] font-bold'
                        : 'text-[#5b7566] hover:text-[#1e3a2b] hover:bg-[#f4f8f5]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-[#1e3a2b] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {step.stepNumber}
                        </div>
                      ) : !isUnlocked ? (
                        <div className="w-5 h-5 rounded-full bg-[#f0f5f1] text-[#9cb5a5] flex items-center justify-center shrink-0">
                          <Lock size={11} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-[#d8e5dc] text-[#5b7566] flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {step.stepNumber}
                        </div>
                      )}
                      <span className={isActive ? 'font-bold text-[#1e3a2b]' : 'font-medium'}>
                        {step.label}
                      </span>
                    </div>

                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Profile & Companion Card */}
        <div className="p-3 border-t border-[#e2ece5] bg-white">
          <div
            onClick={() => {
              sound.playClick();
              setShowSettingsModal(true);
            }}
            className="p-2.5 rounded-2xl bg-[#f4f8f5] border border-[#e2ece5] hover:border-[#c8dad0] flex items-center justify-between gap-2.5 transition-all cursor-pointer group shadow-sm"
            title="Click to view Pet Status and Account Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playPet();
                }}
                className="w-9 h-9 rounded-xl bg-white border border-[#dbe7df] flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:scale-105 transition-transform"
              >
                <PetSVG
                  type={pet?.pet_type || 'fox'}
                  stage={pet?.stage || 'infant'}
                  state={pet?.productivity_state || 'happy'}
                  equipped={pet?.equipped_items}
                  size={36}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-[#1e3a2b] truncate group-hover:text-[#2d6a4f] transition-colors">
                  {pet?.pet_name || 'Maple'} & you
                </p>
                <p className="text-[10px] text-[#7a9386] truncate font-medium flex items-center gap-1.5">
                  <span>Lv {pet?.level || 1} {profile?.role === 'coder' ? 'coder' : 'explorer'}</span>
                  <span>•</span>
                  <span className="font-mono text-[#2d6a4f] font-bold">
                    {profile?.friend_id || ((profile?.skills as any)?.friend_id) || (profile?.id ? generateFriendId(profile.id) : '')}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-1.5 rounded-lg text-[#7a9386] group-hover:text-[#1e3a2b] group-hover:bg-white transition-all">
              <SlidersHorizontal size={14} />
            </div>
          </div>

          {/* Sync status indicator */}
          <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[#7a9386]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f]" />
              Progress synced
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setPlayerRole(profile?.role === 'coder' ? 'non_coder' : 'coder');
              }}
              className="text-[9px] font-bold text-[#2d6a4f] hover:underline"
            >
              {profile?.role === 'coder' ? '💻 Coder' : '🧩 Visual'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Game Page Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f4f8f5]">
        {/* Top Header Breadcrumb & Status HUD */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#f4f8f5] border-b border-[#e2ece5]/60 sticky top-0 z-30">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7a9386]">
            <Link to="/app" className="hover:text-[#1e3a2b] transition-colors">
              Your world
            </Link>
            <ChevronRight size={13} className="text-[#a4bcad]" />
            <span className="text-[#1e3a2b] font-bold">{getBreadcrumbTitle()}</span>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-3">
            {/* XP Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e2ece5] rounded-full text-xs font-bold text-[#1e3a2b] shadow-soft">
              <Sparkles size={13} className="text-amber-500" />
              <span>{profile?.total_xp ?? 50} XP</span>
            </div>

            {/* Gems / Diamond Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e2ece5] rounded-full text-xs font-bold text-[#1e3a2b] shadow-soft">
              <span className="text-xs">💎</span>
              <span>{profile?.coins ?? 0}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                toggleSound();
                sound.playClick();
              }}
              className="p-1.5 rounded-full bg-white border border-[#e2ece5] text-[#7a9386] hover:text-[#1e3a2b] shadow-soft cursor-pointer transition-colors"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 size={14} className="text-[#2d6a4f]" /> : <VolumeX size={14} />}
            </button>

            {/* Profile Avatar */}
            <Link
              to="/app/sanctuary"
              className="w-8 h-8 rounded-full bg-white border border-[#d8e5dc] flex items-center justify-center overflow-hidden shadow-soft hover:scale-105 transition-transform"
              title="View Companion Sanctuary"
            >
              <PetSVG
                type={pet?.pet_type || 'fox'}
                stage={pet?.stage || 'infant'}
                state="happy"
                size={28}
              />
            </Link>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Sticky Productivity & Habit Mini-Taskbar */}
        <Taskbar />
      </div>

      {/* Account Settings & Profile Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
