import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Compass, Bug, Brain, ArrowRight,
  ShieldCheck, ShoppingBag, Code2, Users, Flame
} from 'lucide-react';
import { PetSVG } from '@/components/PetSVG';
import { PET_LIST } from '@/data/pets';
import { sound } from '@/utils/audio';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="text-slate-950" size={20} />
          </div>
          <span className="font-black text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400">
            PETSLYVIA
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            onClick={() => sound.playClick()}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            LOG IN
          </Link>
          <Link
            to="/signup"
            onClick={() => sound.playClick()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs tracking-wide rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            PLAY NOW →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-12 gap-12 items-center relative">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 space-y-6 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300">
            <Sparkles size={14} /> Zero Coding Experience Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            Raise your pet. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400">
              Build your logic.
            </span> <br />
            Fix the world.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            PETSLYVIA is an adventure world where complete beginners start with zero knowledge and naturally learn programming through exploration, debugging battles, and multiplayer collaboration.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/signup"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm tracking-wide rounded-2xl shadow-xl shadow-amber-500/25 transition-all"
            >
              Start Adventure Free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              onClick={() => sound.playClick()}
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl border border-slate-800 transition-all"
            >
              I Have an Account
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-900 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-amber-400" />
              <span>Visual Quests</span>
            </div>
            <div className="flex items-center gap-2">
              <Bug size={16} className="text-rose-400" />
              <span>Bug Exchange</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-indigo-400" />
              <span>Pet Evolution</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Pet Visual Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-5 flex justify-center relative z-10"
        >
          <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="w-full text-center mb-4">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                Companion Ready
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">Pixel · Infant Cat</h3>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 to-orange-500/30 rounded-full blur-xl" />
              <PetSVG
                type="cat"
                stage="infant"
                state="happy"
                equipped={{ head: 'cap_starter', eyes: 'glasses_round' }}
                size={180}
              />
            </div>

            <div className="w-full bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 mt-4 text-center">
              <span className="text-xs font-bold text-slate-300">Ability: Runner ⚡</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Evolves to Child at Level 3</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The 7 Progression Stages Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
            The Learning Journey
          </span>
          <h2 className="text-3xl font-black text-white mt-1">
            From Zero to Code Without Ever Feeling Bored
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '1. PLAY', title: 'Game Controls', desc: 'Control your pet with simple directional arrows.', icon: '🎮' },
            { step: '2. DISCOVER', title: 'Code Revealed', desc: 'See how your actions secretly formed a real program.', icon: '💡' },
            { step: '3. VISUAL LOGIC', title: 'Logic Cards', desc: 'Snap and reorder blocks for Repeat loops & conditionals.', icon: '🧩' },
            { step: '4. BREAK & FIX', title: 'Bug Hunting', desc: 'Inspect broken systems, replace flawed steps, and debug.', icon: '🐛' },
            { step: '5. ALTER', title: 'System Modding', desc: 'Modify live traffic grids and see real-time changes.', icon: '🏙️' },
            { step: '6. CREATE', title: 'Level Designer', desc: 'Build and publish your own puzzles for the world.', icon: '🎨' },
            { step: '7. REAL CODE', title: 'Python & JS', desc: 'Execute real sandbox code when you feel ready.', icon: '⚡' },
            { step: '8. MULTIPLAYER', title: 'Bug Exchange', desc: 'Trade intentional bugs with friends worldwide.', icon: '👥' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800/80 space-y-2 hover:border-amber-400/40 transition-all"
            >
              <div className="text-2xl">{item.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                {item.step}
              </span>
              <h4 className="font-extrabold text-sm text-white">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
