import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Map, Home, Compass, Bug, Building2, ShoppingBag,
  Sparkles, Users, Award, Code2, LogOut, Volume2, VolumeX, Menu, X, Coins, Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { PetSVG } from '@/components/PetSVG';
import { Taskbar } from '@/components/Taskbar';
import { sound } from '@/utils/audio';

const NAV_ITEMS = [
  { to: '/app', label: 'World Map', icon: Map, areaKey: 'all' },
  { to: '/app/sanctuary', label: 'Pet Home', icon: Home, areaKey: 'pet_home' },
  { to: '/app/forest', label: 'Logic Forest', icon: Compass, areaKey: 'logic_forest' },
  { to: '/app/dungeon', label: 'Bug Dungeon', icon: Bug, areaKey: 'bug_dungeon' },
  { to: '/app/city', label: 'Smart City', icon: Building2, areaKey: 'smart_city' },
  { to: '/app/shop', label: 'Bazaar Shop', icon: ShoppingBag, areaKey: 'shop' },
  { to: '/app/creator', label: 'Creator World', icon: Sparkles, areaKey: 'creator_world' },
  { to: '/app/multiplayer', label: 'Bug Exchange', icon: Users, areaKey: 'challenge_arena' },
  { to: '/app/lab', label: 'Coding Lab', icon: Code2, areaKey: 'coding_lab' },
  { to: '/app/skills', label: 'Skills & Badges', icon: Award, areaKey: 'all' },
];

export function GameLayout() {
  const { logout } = useAuth();
  const { profile, pet, soundEnabled, toggleSound, setPlayerRole } = useGameData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    sound.playClick();
    await logout();
    navigate('/login');
  };

  const stageColors: Record<string, string> = {
    infant: 'from-amber-400 to-orange-400 text-slate-950',
    child: 'from-emerald-400 to-teal-400 text-slate-950',
    teen: 'from-indigo-400 to-purple-400 text-white',
    adult: 'from-rose-400 to-pink-500 text-white',
  };

  const currentStage = pet?.stage || 'infant';
  const stageBadgeStyle = stageColors[currentStage] || stageColors.infant;

  // Level progress percentage (0 - 100)
  const xpInCurrentLevel = (profile?.total_xp || 50) % 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden">
      {/* Top Mobile Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 text-sm">
            P
          </div>
          <span className="font-extrabold text-sm tracking-wider text-amber-400">PETSLYVIA</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlayerRole(profile?.role === 'coder' ? 'non_coder' : 'coder')}
            className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-amber-300"
          >
            {profile?.role === 'coder' ? '💻 Coder' : '🧩 Visual'}
          </button>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-xs font-bold text-amber-300">
            <Coins size={13} /> {profile?.coins ?? 100}
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation HUD */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            to="/app"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="text-slate-950" size={18} />
            </div>
            <div>
              <span className="font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 block leading-tight">
                PETSLYVIA
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
                Logic Adventure World
              </span>
            </div>
          </Link>
        </div>

        {/* Pet Mini HUD Status Card */}
        {pet && (
          <div className="mx-3 my-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden relative">
                <PetSVG
                  type={pet.pet_type}
                  stage={pet.stage}
                  state={pet.productivity_state}
                  equipped={pet.equipped_items}
                  size={50}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-white truncate">{pet.pet_name}</p>
                  <span
                    className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r ${stageBadgeStyle}`}
                  >
                    {currentStage}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${xpInCurrentLevel}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 font-semibold">
                    Lv.{pet.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Track Switcher Button */}
            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px]">
              <span className="text-slate-400 text-[10px] font-bold">Track:</span>
              <button
                onClick={() => {
                  sound.playClick();
                  setPlayerRole(profile?.role === 'coder' ? 'non_coder' : 'coder');
                }}
                className="flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                title="Click to switch between Coder and Visual Explorer track"
              >
                {profile?.role === 'coder' ? '💻 Coder Pioneer ⇄' : '🧩 Visual Explorer ⇄'}
              </button>
            </div>

            {/* Currency & XP quick counters */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[11px] font-bold">
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-lg text-amber-300">
                <Coins size={13} /> {profile?.coins ?? 100} Coins
              </div>
              <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-1 rounded-lg text-indigo-300">
                <Zap size={13} /> {profile?.total_xp ?? 50} XP
              </div>
            </div>
          </div>
        )}

        {/* Navigation Regions List */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 py-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isUnlocked =
              item.areaKey === 'all' || (profile?.unlocked_areas && profile.unlocked_areas.includes(item.areaKey));
            const isActive =
              location.pathname === item.to || (item.to !== '/app' && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  sound.playClick();
                  setMobileOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                } ${!isUnlocked ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {!isUnlocked && (
                  <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                    Locked
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={() => {
              toggleSound();
              sound.playClick();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} />}
              <span>Sound Effects</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Game Page Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950 flex flex-col relative">
        <Outlet />
        <Taskbar />
      </main>
    </div>
  );
}
