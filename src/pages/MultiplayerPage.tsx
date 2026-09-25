import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Bug, Sparkles, CheckCircle2, Play,
  Trophy, Swords, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Hand, Trash2, Box, Plus, Radio, RefreshCw,
  Wifi, WifiOff, Loader2, LogIn, LogOut as LeaveIcon,
  Zap, Lock, Clock
} from "lucide-react";
import { useGameData } from "@/hooks/useGameData";
import type { BugExchangeItem, CommunityProblem, VisualBlock, SimulationStep } from "@/types/game";
import type { Contact } from "@/types/database";
import { runDeterministicSimulation } from "@/services/gameEngine";
import { PetSVG } from "@/components/PetSVG";
import { GameScene3D } from "@/components/game3d/GameScene3D";
import { sound } from "@/utils/audio";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { AREA_LABELS, type LobbyPresence } from "@/services/multiplayerRealtimeService";
import type { GameRoom, LeaderboardEntry } from "@/services/multiplayerRoomService";
import { getArenaForContact } from "@/data/arenas";

const STATUS_COLORS: Record<string, string> = {
  online: "bg-slate-400", lobby: "bg-yellow-400", playing: "bg-emerald-400", finished: "bg-purple-400",
};
const STATUS_LABELS: Record<string, string> = {
  online: "Online", lobby: "In Lobby", playing: "Playing", finished: "Finished",
};

function StatusDot({ status }: { status: string }) {
  const isPulsing = status === "playing";
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {isPulsing && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${STATUS_COLORS[status] ?? "bg-slate-400"} opacity-75`} />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${STATUS_COLORS[status] ?? "bg-slate-400"}`} />
    </span>
  );
}

function ConnectionBanner({ status, reconnectCount }: { status: string; reconnectCount: number }) {
  if (status === "connected") return null;
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold ${status === "reconnecting" ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
      {status === "reconnecting"
        ? <><Loader2 size={14} className="animate-spin" /> Reconnecting… (attempt {reconnectCount})</>
        : <><WifiOff size={14} /> Multiplayer unavailable — internet connection required.</>}
    </motion.div>
  );
}

function PlayerCard({ player }: { player: LobbyPresence }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-4 border border-[#e2ece5] hover:border-[#2d6a4f] transition-all shadow-soft flex items-center gap-3">
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[#f4f8f5] border border-[#e2ece5] flex items-center justify-center">
          <PetSVG type={player.petType as any} stage={player.petStage as any} state="happy" size={36} />
        </div>
        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[player.status] ?? "bg-slate-400"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-extrabold text-xs text-[#1b382b] truncate">{player.username}</p>
          {player.friendId && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#f4f8f5] text-[#2d6a4f] rounded border border-[#e2ece5]">
              {player.friendId}
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#5b7566] capitalize truncate">{player.petStage} {player.petType}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${STATUS_COLORS[player.status] ?? "bg-slate-400"}`}>
            {STATUS_LABELS[player.status] ?? player.status}
          </span>
          {player.missionId && <span className="text-[9px] text-[#5b7566] font-mono truncate max-w-[90px]">{player.missionId}</span>}
        </div>
        {player.status === "playing" && player.progress > 0 && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-[#7a9386]">Progress</span>
              <span className="text-[8px] font-black text-[#2d6a4f]">{player.progress}%</span>
            </div>
            <div className="h-1 bg-[#e2ece5] rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-400 rounded-full" initial={{ width: 0 }} animate={{ width: `${player.progress}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 text-center">
        <span className="block text-[8px] text-[#7a9386] font-bold">Lv</span>
        <span className="text-sm font-black text-[#2d6a4f]">{player.level}</span>
      </div>
    </motion.div>
  );
}

function RoomCard({ room, onJoin, isJoining }: { room: GameRoom; onJoin: () => void; isJoining: boolean }) {
  const pct = Math.round((room.player_count / room.max_players) * 100);
  const isFull = room.player_count >= room.max_players;
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e2ece5] hover:border-[#2d6a4f] transition-all space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-extrabold text-sm text-[#1b382b]">{room.name}</p>
          <p className="text-[10px] text-[#5b7566] mt-0.5">{room.mission_id ? `Mission: ${room.mission_id}` : "Open Practice"} · Lv {room.level}</p>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${room.status === "playing" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-[#eaf2ec] text-[#2d6a4f] border border-[#d3e2d8]"}`}>
          {room.status === "playing" ? "In Progress" : "Waiting"}
        </span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#7a9386]">Players</span>
          <span className="text-[9px] font-black text-[#1b382b]">{room.player_count} / {room.max_players}</span>
        </div>
        <div className="h-1.5 bg-[#e2ece5] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isFull ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button onClick={onJoin} disabled={isFull || isJoining || room.status === "playing"}
        className="w-full py-2.5 bg-[#2d6a4f] hover:bg-[#245840] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
        {isJoining ? <><Loader2 size={12} className="animate-spin" /> Joining…</> : isFull ? <><Lock size={12} /> Full</> : room.status === "playing" ? <><Clock size={12} /> In Progress</> : <><LogIn size={12} /> Join Room</>}
      </button>
    </div>
  );
}

function LeaderboardRow({ entry, liveStatuses }: { entry: LeaderboardEntry; liveStatuses: Map<string, LobbyPresence> }) {
  const live = liveStatuses.get(entry.user_id);
  return (
    <div className={`flex items-center gap-3 px-5 py-3 transition-colors ${entry.rank <= 3 ? "bg-amber-50/40" : "hover:bg-[#f4f8f5]"}`}>
      <span className={`w-8 text-center font-black text-sm shrink-0 ${entry.rank === 1 ? "text-amber-500" : entry.rank === 2 ? "text-slate-500" : entry.rank === 3 ? "text-orange-500" : "text-[#7a9386]"}`}>
        {entry.rank <= 3 ? (["🥇","🥈","🥉"])[entry.rank - 1] : `#${entry.rank}`}
      </span>
      <div className="w-9 h-9 rounded-xl bg-[#f4f8f5] border border-[#e2ece5] flex items-center justify-center shrink-0">
        <PetSVG type={entry.pet_type as any} stage={entry.pet_stage as any} state="happy" size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-extrabold text-xs text-[#1b382b] truncate">{entry.username}</p>
          {live && <StatusDot status={live.status} />}
        </div>
        <p className="text-[9px] text-[#5b7566] truncate">Lv {entry.level} · {entry.wins}W · {entry.missions_completed} missions</p>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-right">
        <div className="hidden sm:block">
          <span className="block text-[8px] text-[#7a9386] font-bold">Score</span>
          <span className="text-xs font-black text-[#1b382b]">{(entry.score ?? 0).toLocaleString()}</span>
        </div>
        <div>
          <span className="block text-[8px] text-[#7a9386] font-bold">XP</span>
          <span className="text-xs font-black text-amber-600">{(entry.xp ?? 0).toLocaleString()}</span>
        </div>
        <div className="hidden md:block">
          <span className="block text-[8px] text-[#7a9386] font-bold">Walls</span>
          <span className="text-xs font-black text-[#2d6a4f]">{entry.walls_broken}</span>
        </div>
      </div>
    </div>
  );
}

function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, max: number) => void }) {
  const [name, setName] = useState("");
  const [max, setMax] = useState(8);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-card space-y-4 border border-[#e2ece5]">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-[#1b382b]">Create Room</h3>
          <button onClick={onClose} className="text-[#5b7566] hover:text-[#1b382b] cursor-pointer"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#5b7566] block mb-1">Room Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pavan's Arena" maxLength={40}
              className="w-full px-3 py-2 border border-[#e2ece5] rounded-xl text-sm focus:border-[#2d6a4f] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#5b7566] block mb-1">Max Players ({max})</label>
            <input type="range" min={2} max={12} value={max} onChange={(e) => setMax(Number(e.target.value))} className="w-full accent-[#2d6a4f]" />
            <div className="flex justify-between text-[9px] text-[#7a9386] mt-0.5"><span>2</span><span>12</span></div>
          </div>
        </div>
        <button onClick={() => { if (name.trim()) { onCreate(name.trim(), max); onClose(); } }} disabled={!name.trim()}
          className="w-full py-3 bg-[#2d6a4f] hover:bg-[#245840] disabled:opacity-50 text-white font-black text-sm rounded-2xl transition-all cursor-pointer">
          Create & Join
        </button>
      </motion.div>
    </div>
  );
}

function RoomPanel({ room, sessions, roomPlayers, recentEvents, isReady, currentUserId, onToggleReady, onLeave }: {
  room: GameRoom; sessions: any[]; roomPlayers: any[]; recentEvents: any[];
  isReady: boolean; currentUserId: string; onToggleReady: () => void; onLeave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[#1b382b] rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </span>
            <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">Live Room</span>
          </div>
          <h2 className="text-xl font-black text-white">{room.name}</h2>
          <p className="text-emerald-200 text-xs mt-0.5">
            {Math.max(roomPlayers.length, sessions.filter((s: any) => s.status !== "disconnected").length, 1)} / {room.max_players} players
            {room.mission_id ? ` · Mission: ${room.mission_id}` : " · Open Practice"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleReady} className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isReady ? "bg-emerald-400 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}>
            <CheckCircle2 size={13} /> {isReady ? "Ready!" : "Set Ready"}
          </button>
          <button onClick={onLeave} className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500/80 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-1.5">
            <LeaveIcon size={13} /> Leave
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
          <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2"><Users size={15} className="text-[#2d6a4f]" /> Players in Room</h3>
          <div className="space-y-2">
            {roomPlayers.length === 0
              ? <div className="text-center py-6 text-[#7a9386] text-xs">Connecting to room channel…</div>
              : roomPlayers.map((p: any) => (
                <div key={p.userId} className="flex items-center gap-3 p-3 bg-[#f4f8f5] rounded-xl border border-[#e2ece5]">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e2ece5] flex items-center justify-center">
                      <PetSVG type={p.petType} stage={p.petStage} state="happy" size={28} />
                    </div>
                    {p.userId === currentUserId && <span className="absolute -top-1 -right-1 text-[7px] bg-[#2d6a4f] text-white font-black px-0.5 rounded">YOU</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-xs text-[#1b382b] truncate">{p.username}</p>
                      <StatusDot status={p.status} />
                      {p.isReady && <span className="text-[8px] text-emerald-600 font-bold">✓ Ready</span>}
                    </div>
                    {p.status === "playing" && (
                      <div className="mt-1">
                        <div className="h-1 bg-[#e2ece5] rounded-full overflow-hidden">
                          <motion.div className="h-full bg-emerald-400 rounded-full" animate={{ width: `${p.progress ?? 0}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[8px] text-[#7a9386]">{p.progress ?? 0}% · {p.wallsBroken ?? 0} walls</span>
                          <span className="text-[8px] font-black text-amber-600">{p.score ?? 0} pts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
          <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2"><Zap size={15} className="text-amber-500" /> Live Events</h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {recentEvents.length === 0
              ? <div className="text-center py-6 text-[#7a9386] text-xs">Events appear as players play…</div>
              : recentEvents.slice(0, 20).map((evt: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 text-base">
                    {evt.type === "wall_broken" ? "💥" : evt.type === "player_finished" ? "🏆" : evt.type === "player_joined" ? "👋" : evt.type === "player_left" ? "💨" : evt.type === "player_ready" ? "✅" : evt.type === "wrong_answer" ? "❌" : "⚡"}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-[#1b382b]">{evt.payload?.username ?? "Player"}</span>
                    <span className="text-[#5b7566]">
                      {evt.type === "wall_broken" ? ` broke a wall! (+${evt.payload?.xpAwarded ?? 0} XP)` : evt.type === "player_finished" ? ` finished!${evt.payload?.isFirst ? " 🥇" : ""}` : evt.type === "player_joined" ? " joined" : evt.type === "player_left" ? " left" : evt.type === "player_ready" ? ` is ${evt.payload?.isReady ? "ready" : "not ready"}` : ` ${evt.type.replace(/_/g," ")}`}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = "arena" | "live" | "leaderboard" | "bugs" | "community";

export function MultiplayerPage() {
  const { profile, pet, bugExchanges, communityProblems, contacts, solveBug, completeMission } = useGameData();
  const {
    connectionStatus, reconnectCount, isOnline,
    onlinePlayers, liveCount,
    openRooms, loadingRooms, refreshRooms,
    currentRoom, currentSession, roomPlayers, roomSessions, recentEvents,
    createAndJoinRoom, joinExistingRoom, quickMatch, leaveCurrentRoom, toggleReady,
    leaderboard, leaderboardType, loadingLb, setLeaderboardType, refreshLeaderboard,
  } = useMultiplayerRoom();

  const [activeTab, setActiveTab] = useState<Tab>("arena");
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Legacy state (bug exchange + duel)
  const [selectedBug, setSelectedBug] = useState<BugExchangeItem | null>(bugExchanges[0] || null);
  const [bugBlocks, setBugBlocks] = useState<VisualBlock[]>(bugExchanges[0]?.brokenBlocks || []);
  const [solving, setSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<string | null>(null);
  const [bugSimSteps, setBugSimSteps] = useState<SimulationStep[]>([]);
  const [bugSimStepIndex, setBugSimStepIndex] = useState(0);
  const [selectedOpponent, setSelectedOpponent] = useState<Contact | null>(null);
  const [duelBlocks, setDuelBlocks] = useState<VisualBlock[]>([
    { id: "d1", type: "move_down" }, { id: "d2", type: "move_down" },
    { id: "d3", type: "move_down" }, { id: "d4", type: "move_right" },
  ]);
  const [duelRacing, setDuelRacing] = useState(false);
  const [playerDuelStep, setPlayerDuelStep] = useState(0);
  const [opponentDuelStep, setOpponentDuelStep] = useState(0);
  const [playerSimulationSteps, setPlayerSimulationSteps] = useState<SimulationStep[]>([]);
  const [duelResult, setDuelResult] = useState<{ winner: "player" | "opponent" | null; message: string } | null>(null);
  const raceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bugRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (raceRef.current) clearInterval(raceRef.current);
    if (bugRef.current)  clearInterval(bugRef.current);
  }, []);

  const handleCloseDuel = () => {
    if (raceRef.current) { clearInterval(raceRef.current); raceRef.current = null; }
    setDuelRacing(false); sound.playClick(); setSelectedOpponent(null);
  };

  const handleQuickMatch = async () => {
    setRoomError(null);
    setJoiningRoomId("quick");
    sound.playClick();
    const { error } = await quickMatch();
    setJoiningRoomId(null);
    if (error) { setRoomError(error); return; }
    setActiveTab("arena");
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId); setRoomError(null);
    const { error } = await joinExistingRoom(roomId);
    setJoiningRoomId(null);
    if (error) { setRoomError(error); return; }
    setActiveTab("arena");
  };

  const handleCreateRoom = async (name: string, maxPlayers: number) => {
    setRoomError(null);
    const { error } = await createAndJoinRoom(name, maxPlayers);
    if (error) setRoomError(error);
  };

  const handleRunSolve = () => {
    if (!selectedBug) return;
    sound.playClick(); setSolving(true); setSolveResult(null);
    const result = runDeterministicSimulation(
      selectedBug.grid, selectedBug.grid.start, "right",
      selectedBug.grid.goal, selectedBug.grid.obstacles,
      selectedBug.grid.crystals, selectedBug.grid.switches || [], bugBlocks
    );
    if (bugRef.current) { clearInterval(bugRef.current); bugRef.current = null; }
    setBugSimSteps(result.steps); setBugSimStepIndex(0);
    let step = 0;
    bugRef.current = setInterval(async () => {
      step++;
      if (step < result.steps.length) { setBugSimStepIndex(step); sound.playStep(); }
      else {
        if (bugRef.current) { clearInterval(bugRef.current); bugRef.current = null; }
        setSolving(false);
        if (result.success) { sound.playVictory(); await solveBug(selectedBug.id); setSolveResult("🏆 Bug Challenge Solved! Bounty Claimed!"); }
        else { sound.playError(); setSolveResult(`❌ Test Failed: ${result.message}`); }
      }
    }, 380);
  };

  const handleOpenChallenge = (contact: Contact) => {
    sound.playClick();
    if (raceRef.current) { clearInterval(raceRef.current); raceRef.current = null; }
    const arena = getArenaForContact(contact);
    setSelectedOpponent(contact);
    setDuelBlocks(arena.startPos.y > arena.goalPos.y
      ? [{ id: "d1", type: "move_up" }, { id: "d2", type: "move_up" }, { id: "d3", type: "move_right" }]
      : [{ id: "d1", type: "move_down" }, { id: "d2", type: "move_down" }, { id: "d3", type: "move_right" }]);
    setPlayerDuelStep(0); setOpponentDuelStep(0); setPlayerSimulationSteps([]); setDuelResult(null); setDuelRacing(false);
  };

  const handleStartDuelRace = () => {
    if (duelBlocks.length === 0) { sound.playError(); return; }
    sound.playClick(); setDuelRacing(true); setDuelResult(null);
    const arena = selectedOpponent ? getArenaForContact(selectedOpponent, communityProblems) : getArenaForContact(contacts[0], communityProblems);
    const playerSim = runDeterministicSimulation(arena.gridSize, arena.startPos, arena.startDir, arena.goalPos, arena.obstacles, arena.crystals, arena.switches || [], duelBlocks);
    setPlayerSimulationSteps(playerSim.steps);
    const opponentTotal = arena.botPath.length - 1;
    let stepCount = 0;
    if (raceRef.current) { clearInterval(raceRef.current); raceRef.current = null; }
    raceRef.current = setInterval(() => {
      stepCount++;
      setPlayerDuelStep(Math.min(stepCount, playerSim.steps.length - 1));
      setOpponentDuelStep(Math.min(stepCount, opponentTotal));
      sound.playStep();
      if (stepCount >= Math.max(playerSim.steps.length, opponentTotal + 1)) {
        if (raceRef.current) { clearInterval(raceRef.current); raceRef.current = null; }
        setDuelRacing(false);
        if (playerSim.success && playerSim.steps.length <= opponentTotal + 2) { sound.playVictory(); setDuelResult({ winner: "player", message: `Victory! Outpaced ${selectedOpponent?.friend_name}!` }); completeMission("multiplayer_duel", 50, 30, { collaboration: 15, logic: 10 }); }
        else if (playerSim.success) { sound.playVictory(); setDuelResult({ winner: "player", message: "Challenge Completed!" }); completeMission("multiplayer_duel", 40, 20, { collaboration: 10 }); }
        else { sound.playError(); setDuelResult({ winner: "opponent", message: `Duel Lost: ${playerSim.message || "Did not reach portal."}` }); }
      }
    }, 450);
  };

  const currentArena = selectedOpponent ? getArenaForContact(selectedOpponent, communityProblems) : null;
  const playerActivePos = playerSimulationSteps.length > 0 && playerSimulationSteps[playerDuelStep] ? playerSimulationSteps[playerDuelStep].petPos : currentArena?.startPos ?? { x: 0, y: 0 };
  const opponentActivePos = currentArena && currentArena.botPath[Math.min(opponentDuelStep, currentArena.botPath.length - 1)] ? currentArena.botPath[Math.min(opponentDuelStep, currentArena.botPath.length - 1)] : { x: 0, y: 0 };
  const playerCrystals = playerSimulationSteps.length > 0 && playerSimulationSteps[playerDuelStep] ? playerSimulationSteps[playerDuelStep].crystalsCollected : [];
  const bugActivePos = bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex] ? bugSimSteps[bugSimStepIndex].petPos : selectedBug?.grid.start ?? { x: 0, y: 0 };

  const liveStatusMap = new Map<string, LobbyPresence>(onlinePlayers.map((p) => [p.userId, p]));
  const myUserId = profile?.id ?? "";

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="p-5 bg-white rounded-3xl border border-[#e2ece5] shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#eaf2ec] border border-[#d3e2d8] rounded-full text-xs font-bold text-[#2d6a4f] mb-2">
            <Users size={14} /> Global Multiplayer Arena
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1b382b] tracking-tight">
            {currentRoom ? currentRoom.name : "Bug Exchange & Multiplayer Arena"}
          </h1>
          <p className="text-xs sm:text-sm text-[#5b7566] mt-1">
            {currentRoom ? `You are in room "${currentRoom.name}" — ${Math.max(roomPlayers.length, roomSessions.filter((s: any) => s.status !== "disconnected").length, 1)} players connected` : "Challenge friends, solve bugs, and compete in real-time multiplayer rooms"}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${isOnline ? "bg-[#1b382b]" : "bg-slate-700"}`}>
            {isOnline ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-slate-400" />}
            <span className={`font-black text-sm ${isOnline ? "text-emerald-300" : "text-slate-400"}`}>{liveCount}</span>
            <span className={`text-xs font-medium ${isOnline ? "text-emerald-100" : "text-slate-400"}`}>online now</span>
          </div>
          <div className="flex gap-2 bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5] text-xs">
            <div className="text-center px-2 border-r border-[#e2ece5]">
              <span className="text-[#5b7566] block text-[9px] font-bold uppercase">Bugs Solved</span>
              <span className="text-base font-black text-[#2d6a4f]">{profile?.bugs_solved ?? 0}</span>
            </div>
            <div className="text-center px-2">
              <span className="text-[#5b7566] block text-[9px] font-bold uppercase">Bugs Created</span>
              <span className="text-base font-black text-[#1b382b]">{profile?.bugs_created ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <ConnectionBanner status={connectionStatus} reconnectCount={reconnectCount} />

      {roomError && (
        <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold">
          <span>⚠️ {roomError}</span>
          <button onClick={() => setRoomError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[#e2ece5] gap-1 flex-wrap shadow-soft">
        {([
          { key: "arena",       icon: <Swords size={13} />,   label: "Arena" },
          { key: "live",        icon: <Radio size={13} />,    label: "Live", badge: liveCount > 0 ? liveCount : null },
          { key: "leaderboard", icon: <Trophy size={13} />,   label: "Leaderboard" },
          { key: "bugs",        icon: <Bug size={13} />,      label: "Bugs" },
          { key: "community",   icon: <Sparkles size={13} />, label: "Community" },
        ] as const).map(({ key, icon, label, badge }: any) => (
          <button key={key} onClick={() => { setActiveTab(key); sound.playClick(); }}
            className={`flex-1 min-w-[60px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === key
                ? key === "live" ? "bg-emerald-600 text-white shadow-sm"
                : key === "leaderboard" ? "bg-amber-500 text-white shadow-sm"
                : "bg-[#2d6a4f] text-white shadow-sm"
                : "text-[#5b7566] hover:text-[#1b382b]"}`}>
            {icon} {label}
            {badge != null && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[8px] font-black bg-emerald-500 text-white rounded-full px-1 flex items-center justify-center">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ARENA TAB */}
      {activeTab === "arena" && (
        <div className="space-y-4">
          {currentRoom ? (
            <RoomPanel room={currentRoom} sessions={roomSessions} roomPlayers={roomPlayers} recentEvents={recentEvents} isReady={currentSession?.is_ready ?? false} currentUserId={myUserId} onToggleReady={toggleReady} onLeave={leaveCurrentRoom} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2"><Users size={15} className="text-[#2d6a4f]" /> Open Rooms</h3>
                  <div className="flex gap-2">
                    <button onClick={handleQuickMatch} disabled={joiningRoomId !== null} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm">
                      <Zap size={13} /> Quick Match
                    </button>
                    <button onClick={refreshRooms} disabled={loadingRooms} className="p-2 rounded-xl border border-[#e2ece5] text-[#5b7566] hover:text-[#1b382b] hover:bg-[#f4f8f5] transition-all cursor-pointer">
                      <RefreshCw size={14} className={loadingRooms ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className="px-3 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer">
                      <Plus size={13} /> Create Room
                    </button>
                  </div>
                </div>
                {openRooms.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-[#e2ece5] text-center space-y-2">
                    <div className="text-3xl">🏟️</div>
                    <p className="text-[#5b7566] text-sm font-medium">No open rooms yet.</p>
                    <button onClick={() => setShowCreateModal(true)} className="mx-auto mt-2 px-4 py-2 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"><Plus size={12} /> Create Room</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {openRooms.map((room) => <RoomCard key={room.room_id} room={room} onJoin={() => handleJoinRoom(room.room_id)} isJoining={joiningRoomId === room.room_id} />)}
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
                <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2"><Swords size={15} className="text-[#2d6a4f]" /> 1v1 Friend Duels</h3>
                <p className="text-xs text-[#5b7566]">Quick head-to-head algorithm race.</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-[#f4f8f5] rounded-xl border border-[#e2ece5]">
                      <PetSVG type={c.friend_pet_type} stage={c.friend_pet_stage} state="happy" size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-xs text-[#1b382b] truncate">{c.friend_name}</p>
                        <p className="text-[9px] text-[#5b7566] capitalize">{c.friend_pet_stage} {c.friend_pet_type}</p>
                      </div>
                      <button onClick={() => handleOpenChallenge(c)} className="px-2.5 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-lg text-xs font-black cursor-pointer flex items-center gap-1">
                        <Swords size={11} /> Duel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIVE TAB */}
      {activeTab === "live" && (
        <div className="space-y-4">
          <div className="bg-[#1b382b] rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" /></span>
                <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">Supabase Realtime Presence</span>
              </div>
              <h2 className="text-xl font-black text-white">{liveCount} Explorer{liveCount !== 1 ? "s" : ""} Online</h2>
              <p className="text-emerald-200 text-xs mt-0.5">Free tier · ~500 concurrent WebSocket connections capacity</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["online","lobby","playing"] as const).map((s) => (
                <div key={s} className="bg-white/10 rounded-2xl px-3 py-2">
                  <span className="block text-emerald-300 text-[9px] uppercase font-bold">{s}</span>
                  <span className="text-white font-black text-base">{onlinePlayers.filter(p => p.status === s).length}</span>
                </div>
              ))}
            </div>
          </div>
          {onlinePlayers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e2ece5] text-center space-y-3">
              <div className="text-4xl">🌐</div>
              <p className="text-[#5b7566] text-sm font-medium">Waiting for players…</p>
              <p className="text-[#7a9386] text-xs">Open this page in another browser to see yourself appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {onlinePlayers.map((p) => <PlayerCard key={p.userId} player={p} />)}
            </div>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === "leaderboard" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy size={20} /> Global Leaderboard</h2>
              <p className="text-amber-100 text-xs mt-0.5">Real persistent rankings · powered by player_stats table</p>
            </div>
            <div className="flex gap-2">
              {(["global","weekly","room"] as const).map((t) => (
                <button key={t} onClick={() => { setLeaderboardType(t); sound.playClick(); setTimeout(refreshLeaderboard, 50); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer capitalize ${leaderboardType === t ? "bg-white text-amber-600" : "bg-white/20 text-white hover:bg-white/30"}`}>
                  {t === "room" && currentRoom ? currentRoom.name.slice(0,8) : t}
                </button>
              ))}
              <button onClick={() => { refreshLeaderboard(); sound.playClick(); }} disabled={loadingLb} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white cursor-pointer">
                <RefreshCw size={14} className={loadingLb ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          {loadingLb ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e2ece5] text-center"><Loader2 size={28} className="animate-spin text-amber-500 mx-auto" /><p className="text-[#5b7566] text-sm mt-3">Loading leaderboard…</p></div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#e2ece5] text-center space-y-3"><div className="text-4xl">🏆</div><p className="text-[#5b7566] text-sm">No entries yet. Break some walls to rank up!</p></div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#e2ece5] shadow-card overflow-hidden">
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-px bg-[#e2ece5] border-b border-[#e2ece5]">
                  {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
                    const medals = ["🥈","🥇","🥉"]; const heights = ["h-20","h-28","h-16"]; const bgs = ["bg-slate-50","bg-amber-50","bg-orange-50"];
                    const live = liveStatusMap.get(entry.user_id);
                    return (
                      <div key={entry.user_id} className={`${bgs[idx]} flex flex-col items-center justify-end p-3 ${heights[idx]}`}>
                        <span className="text-xl mb-1">{medals[idx]}</span>
                        <div className="relative w-9 h-9 rounded-full bg-white border-2 border-[#e2ece5] flex items-center justify-center mb-1">
                          <PetSVG type={entry.pet_type as any} stage={entry.pet_stage as any} state="happy" size={26} />
                          {live && <StatusDot status={live.status} />}
                        </div>
                        <p className="text-[9px] font-black text-[#1b382b] truncate max-w-[72px]">{entry.username}</p>
                        <p className="text-[8px] text-amber-600 font-bold">{(entry.xp ?? 0).toLocaleString()} XP</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="divide-y divide-[#f4f8f5]">
                {leaderboard.map((entry) => <LeaderboardRow key={entry.user_id} entry={entry} liveStatuses={liveStatusMap} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BUGS TAB */}
      {activeTab === "bugs" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#1b382b] flex items-center gap-2"><Bug className="text-[#2d6a4f]" size={16} /> Open Bug Bounties</h3>
              <Link to="/app/creator" onClick={() => sound.playClick()} className="px-3 py-1 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold flex items-center gap-1 transition-all"><Plus size={13} /> Create Bug</Link>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {bugExchanges.map((b) => (
                <div key={b.id} onClick={() => { sound.playClick(); setSelectedBug(b); setBugBlocks([...b.brokenBlocks]); setSolveResult(null); setBugSimSteps([]); setBugSimStepIndex(0); }}
                  className={`w-full text-left p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${selectedBug?.id === b.id ? "bg-[#eaf2ec] border-[#2d6a4f] shadow-card" : "bg-white border-[#e2ece5] hover:border-[#2d6a4f]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[#eaf2ec] text-[#2d6a4f] border border-[#d3e2d8]">⚡ Bug Challenge</span>
                    <span className="text-[10px] bg-[#f4f8f5] text-[#5b7566] font-mono px-2 py-0.5 rounded-full border border-[#e2ece5]">{b.solversCount} Solves</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#1b382b]">{b.title}</h4>
                  <p className="text-xs text-[#5b7566] line-clamp-2">{b.intendedGoal}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#e2ece5] text-[11px] font-bold">
                    <span className="text-[#2d6a4f] font-black">+{b.rewardCoins} Coins</span>
                    <span className="text-xs text-[#5b7566]">by <strong className="text-[#1b382b]">{b.creatorName}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e2ece5] shadow-card space-y-4">
            {selectedBug ? (
              <>
                <h3 className="font-black text-lg text-[#1b382b]">{selectedBug.title}</h3>
                <p className="text-xs text-[#5b7566]">{selectedBug.intendedGoal}</p>
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5] flex flex-col items-center">
                  <GameScene3D
                    gridSize={{ width: selectedBug.grid.width, height: selectedBug.grid.height }}
                    startPos={selectedBug.grid.start} goalPos={selectedBug.grid.goal}
                    obstacles={selectedBug.grid.obstacles} crystals={selectedBug.grid.crystals}
                    switches={selectedBug.grid.switches || []}
                    activeStep={bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex] ? bugSimSteps[bugSimStepIndex] : { stepIndex: 0, petPos: selectedBug.grid.start, petDir: "right", petAction: "idle", crystalsCollected: [], openGates: [], status: "running" }}
                    petType={pet?.pet_type || "cat"} equipped={pet?.equipped_items} theme="dungeon" height="260px"
                  />
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {bugBlocks.map((blk, idx) => (
                    <div key={blk.id || idx} className="flex items-center justify-between bg-[#f4f8f5] p-2 rounded-xl border border-[#e2ece5] text-xs">
                      <span className="font-mono text-[#7a9386] w-6">#{idx + 1}</span>
                      <select value={blk.type} onChange={(e) => setBugBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, type: e.target.value as any } : b))} className="bg-white text-[#1b382b] font-bold px-3 py-1 rounded-lg border border-[#e2ece5] outline-none text-xs flex-1 mx-2">
                        {["move_forward","turn_right","turn_left","move_up","move_down","move_left","move_right","interact"].map(t => <option key={t} value={t}>{t}()</option>)}
                      </select>
                      <button onClick={() => setBugBlocks((prev) => prev.filter((_, i) => i !== idx))} className="text-[#7a9386] hover:text-rose-600 px-1 cursor-pointer">×</button>
                    </div>
                  ))}
                </div>
                {solveResult && <div className={`p-3 rounded-xl text-xs font-bold text-center ${solveResult.includes("Claimed") ? "bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>{solveResult}</div>}
                <button onClick={handleRunSolve} disabled={solving} className="w-full py-3.5 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-sm rounded-2xl shadow-card transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                  <Play size={18} className="fill-white" /> {solving ? "SIMULATING…" : "RUN BUG CHALLENGE TEST & CLAIM BOUNTY"}
                </button>
              </>
            ) : <div className="text-center py-20 text-[#7a9386] text-sm">Select a bug from the list to debug!</div>}
          </div>
        </div>
      )}

      {/* COMMUNITY TAB */}
      {activeTab === "community" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityProblems.map((p) => (
            <div key={p.id} className="bg-white rounded-3xl p-5 border border-[#e2ece5] space-y-3 flex flex-col justify-between shadow-card">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#5b7566]">By <strong className="text-[#1b382b]">{p.creatorName}</strong></span>
                  <span className="text-[10px] uppercase font-bold text-[#2d6a4f] bg-[#eaf2ec] px-2 py-0.5 rounded-full border border-[#d3e2d8]">{p.difficulty}</span>
                </div>
                <h4 className="font-extrabold text-sm text-[#1b382b]">{p.title}</h4>
                <p className="text-xs text-[#5b7566] mt-1 line-clamp-3">{p.description}</p>
              </div>
              <div className="pt-3 border-t border-[#e2ece5] flex items-center justify-between text-xs">
                <span className="text-[#5b7566] text-[11px]">Plays: <strong>{p.playsCount}</strong> · Solves: <strong className="text-[#2d6a4f]">{p.solvesCount}</strong></span>
                <button onClick={() => { sound.playClick(); setSelectedOpponent({ id: `comm_${p.id}`, user_id: "community", friend_user_id: p.creatorId || "community", friend_name: p.creatorName, friend_pet_type: "fox", friend_pet_stage: "teen", status: "accepted", is_online: true, created_at: new Date().toISOString() }); setActiveTab("arena"); }}
                  className="px-3 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-xl text-xs font-bold cursor-pointer">Play Level</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Duel modal */}
      <AnimatePresence>
        {selectedOpponent && (
          <div onClick={(e) => { if (e.target === e.currentTarget && !duelRacing) handleCloseDuel(); }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white border border-[#e2ece5] rounded-3xl p-5 max-w-2xl w-full space-y-4 shadow-card relative my-6">
              <button onClick={handleCloseDuel} className="absolute top-4 right-4 px-3 py-1.5 text-xs font-extrabold text-[#5b7566] hover:text-[#1b382b] rounded-xl bg-[#f4f8f5] border border-[#e2ece5] cursor-pointer flex items-center gap-1.5"><X size={14} /> Close</button>
              <div className="text-center"><h3 className="text-lg font-black text-[#1b382b] flex items-center justify-center gap-2"><span className="text-[#2d6a4f]">{pet?.pet_name || "Your Pet"}</span><span className="text-[#7a9386] text-sm">VS</span><span>{selectedOpponent.friend_name}</span></h3></div>
              {currentArena && (
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5]">
                  <GameScene3D gridSize={currentArena.gridSize} startPos={currentArena.startPos} goalPos={currentArena.goalPos} obstacles={currentArena.obstacles}
                    crystals={currentArena.crystals.map(c => ({ x: c.x, y: c.y, collected: playerCrystals.some(pc => pc.x === c.x && pc.y === c.y) }))}
                    switches={currentArena.switches || []}
                    activeStep={{ stepIndex: playerDuelStep, petPos: playerActivePos, petDir: "right", petAction: duelRacing ? "move_forward" : "idle", crystalsCollected: playerCrystals, openGates: [], status: duelResult?.winner === "player" ? "success" : duelResult?.winner === "opponent" ? "failed" : "running", message: duelResult?.message || "" }}
                    petType={pet?.pet_type || "cat"} equipped={pet?.equipped_items} theme="arena"
                    opponentPet={{ type: selectedOpponent.friend_pet_type, pos: opponentActivePos, dir: "right", name: selectedOpponent.friend_name }}
                    cameraPreset="iso" height="300px"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(["move_up","move_down","move_left","move_right","interact"] as const).map((t) => (
                  <button key={t} onClick={() => setDuelBlocks(prev => [...prev, { id: `d_${Date.now()}`, type: t }])} className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold cursor-pointer">+ {t.replace("move_","").replace("_"," ")}</button>
                ))}
                <button onClick={() => setDuelBlocks([])} className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"><Trash2 size={11} /> Clear</button>
              </div>
              <div className="min-h-[48px] max-h-[72px] overflow-y-auto bg-[#f4f8f5] p-2 rounded-xl border border-[#e2ece5] flex flex-wrap gap-1.5">
                {duelBlocks.length === 0 ? <span className="text-xs text-[#7a9386]">Add moves above…</span>
                  : duelBlocks.map((b, i) => <span key={i} className="px-2 py-0.5 bg-white border border-[#e2ece5] text-[10px] font-bold text-[#1b382b] rounded-lg flex items-center gap-1">#{i+1} {b.type.replace("move_","")}<button onClick={() => setDuelBlocks(prev => prev.filter((_,j)=>j!==i))} className="text-[#7a9386] hover:text-rose-600">×</button></span>)}
              </div>
              {duelResult && (
                <div className={`p-4 rounded-2xl text-xs font-bold text-center ${duelResult.winner === "player" ? "bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
                  <div className="text-sm font-black">{duelResult.winner === "player" ? "🏆 VICTORY!" : "⚡ RACE FINISHED"}</div>
                  <div>{duelResult.message}</div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={handleCloseDuel} disabled={duelRacing} className="flex-1 py-3 bg-[#f4f8f5] hover:bg-[#eaf2ec] text-[#5b7566] border border-[#e2ece5] font-bold text-sm rounded-2xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"><X size={15} /> Close</button>
                <button onClick={handleStartDuelRace} disabled={duelRacing || duelBlocks.length === 0} className="flex-1 py-3 bg-[#2d6a4f] hover:bg-[#245840] text-white font-black text-sm rounded-2xl shadow-card transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                  <Play size={16} className="fill-white" /> {duelRacing ? "RACING…" : duelResult ? "RETRY" : "START DUEL!"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateRoom} />}
    </div>
  );
}
