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
    <div className="min-h-screen bg-[#f4f8f5] text-[#1b382b] font-sans selection:bg-[#2d6a4f] selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#1e3a2b]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2e6849]"></div>
            <div className="w-2 h-2 rounded-full bg-[#52936f]"></div>
          </div>
          <span className="font-black text-2xl tracking-tight text-[#1b382b]">
            petslyvia<span className="text-[#2d6a4f]">.</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            onClick={() => sound.playClick()}
            className="px-4 py-2 text-xs font-bold text-[#5b7566] hover:text-[#1b382b] transition-colors"
          >
            LOG IN
          </Link>
          <Link
            to="/signup"
            onClick={() => sound.playClick()}
            className="px-5 py-2.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-xs tracking-wide rounded-2xl shadow-soft transition-all cursor-pointer"
          >
            PLAY NOW →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-12 gap-12 items-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 space-y-6 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#eaf2ec] border border-[#d8e5dc] rounded-full text-xs font-bold text-[#2d6a4f]">
            <Sparkles size={14} /> Zero Coding Experience Required
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1b382b] leading-tight tracking-tight">
            Raise your pet. <br />
            <span className="text-[#2d6a4f]">
              Build your logic.
            </span> <br />
            Fix the world.
          </h1>

          <p className="text-sm sm:text-base text-[#5b7566] max-w-xl leading-relaxed font-medium">
            PETSLYVIA is an adventure world where complete beginners start with zero knowledge and naturally learn programming through exploration, debugging battles, and multiplayer collaboration.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/signup"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#2d6a4f] hover:bg-[#23533e] text-white font-black text-sm tracking-wide rounded-2xl shadow-soft transition-all"
            >
              Start Adventure Free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              onClick={() => sound.playClick()}
              className="px-6 py-3.5 bg-white hover:bg-[#eaf2ec] text-[#1b382b] font-bold text-sm rounded-2xl border border-[#d8e5dc] shadow-soft transition-all"
            >
              I Have an Account
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#e2ece5] text-xs text-[#5b7566] font-semibold">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-[#2d6a4f]" />
              <span>Visual Quests</span>
            </div>
            <div className="flex items-center gap-2">
              <Bug size={16} className="text-[#2d6a4f]" />
              <span>Bug Exchange</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-[#2d6a4f]" />
              <span>Pet Evolution</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Pet Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative bg-white rounded-3xl p-8 border border-[#e2ece5] shadow-card flex flex-col items-center text-center space-y-4">
            <div className="w-full aspect-square bg-[#dce8e0] rounded-2xl border border-[#d8e5dc] flex items-center justify-center relative overflow-hidden shadow-inner p-4">
              <PetSVG
                type="fox"
                stage="infant"
                state="happy"
                size={180}
              />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2d6a4f] bg-[#eaf2ec] px-2.5 py-0.5 rounded-full">
                Your AI Companion
              </span>
              <h3 className="text-xl font-black text-[#1b382b] mt-1.5">
                Meet Maple the Fox
              </h3>
              <p className="text-xs text-[#5b7566] mt-1">
                Evolves dynamically with every line of code and puzzle you conquer.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
