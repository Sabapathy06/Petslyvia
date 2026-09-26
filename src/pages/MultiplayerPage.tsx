import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Bug, Sparkles, CheckCircle2, Play,
  Trophy, Swords, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Hand, Trash2, Box, Plus, Radio, RefreshCw,
  Wifi, WifiOff, Loader2, LogIn, LogOut as LeaveIcon,
  Zap, Lock, Clock, UserPlus, UserCheck,
  Award, Shield, Flame, RotateCcw, AlertCircle, HelpCircle, Code2
} from "lucide-react";
import { useGameData } from "@/hooks/useGameData";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
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
  const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (!isBrowserOffline && (status === "connecting" || status === "disconnected")) {
    if (status === "connecting") return null;
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold ${status === "reconnecting" ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
      {status === "reconnecting"
        ? <><Loader2 size={14} className="animate-spin" /> Reconnecting to multiplayer relay… (attempt {reconnectCount})</>
        : isBrowserOffline
        ? <><WifiOff size={14} /> Multiplayer offline — internet connection required.</>
        : <><Loader2 size={14} className="animate-spin" /> Connecting to real-time multiplayer relay…</>}
    </motion.div>
  );
}

function PlayerCard({
  player,
  currentUserId,
  isFriend,
  onAddFriend,
  onInvite,
}: {
  player: LobbyPresence;
  currentUserId?: string;
  isFriend?: boolean;
  onAddFriend?: () => void;
  onInvite?: () => void;
}) {
  const isMe = Boolean(currentUserId && player.userId === currentUserId);

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
          {isMe && (
            <span className="text-[8px] font-bold text-[#2d6a4f] bg-[#eaf2ec] px-1.5 py-0.2 rounded-full">
              You
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
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <div className="text-right">
          <span className="block text-[8px] text-[#7a9386] font-bold">Lv</span>
          <span className="text-sm font-black text-[#2d6a4f]">{player.level}</span>
        </div>
        {!isMe && (
          isFriend ? (
            onInvite ? (
              <button onClick={onInvite} className="px-2 py-1 text-[10px] font-bold text-white bg-[#2d6a4f] hover:bg-[#22533d] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm">
                <Users size={11} /> Invite
              </button>
            ) : (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Friend ✓</span>
            )
          ) : (
            onAddFriend && (
              <button onClick={onAddFriend} className="px-2 py-1 text-[10px] font-bold text-[#2d6a4f] bg-[#eaf2ec] hover:bg-[#ddebe0] rounded-lg transition-all cursor-pointer flex items-center gap-1">
                <UserPlus size={11} /> Add
              </button>
            )
          )
        )}
      </div>
    </motion.div>
  );
}

function RoomCard({
  room,
  currentUserId,
  currentUsername,
  onJoin,
  onEnter,
  onCloseRoom,
  isJoining
}: {
  room: GameRoom;
  currentUserId?: string;
  currentUsername?: string;
  onJoin: () => void;
  onEnter?: () => void;
  onCloseRoom?: (roomId: string) => void;
  isJoining: boolean;
}) {
  const isHost = Boolean(
    (currentUserId && (room.host_id === currentUserId || room.player_ids?.[0] === currentUserId)) ||
    (currentUsername && (
      (room.host_name && room.host_name.toLowerCase() === currentUsername.toLowerCase()) ||
      (room.name && room.name.toLowerCase() === currentUsername.toLowerCase())
    ))
  );
  const isParticipant = Boolean(
    isHost || (currentUserId && room.player_ids?.includes(currentUserId))
  );
  const pct = Math.round((room.player_count / room.max_players) * 100);
  const isFull = room.player_count >= room.max_players;

  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all space-y-3 ${isHost ? "border-amber-300 ring-1 ring-amber-200/50 shadow-sm" : isParticipant ? "border-emerald-300 ring-1 ring-emerald-200/40" : "border-[#e2ece5] hover:border-[#2d6a4f]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-extrabold text-sm text-[#1b382b] truncate">{room.name}</p>
            {isHost && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                👑 Host
              </span>
            )}
            {!isHost && isParticipant && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Joined
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#5b7566] mt-0.5">
            {room.host_name ? `Host: ${isHost ? 'You' : room.host_name} · ` : ''}
            {room.mission_id ? `Mission: ${room.mission_id}` : "Open Practice"} · Lv {room.level}
          </p>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${room.status === "playing" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-[#eaf2ec] text-[#2d6a4f] border border-[#d3e2d8]"}`}>
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
      <div className="flex gap-2">
        {isHost ? (
          <>
            <button
              onClick={onEnter || onJoin}
              disabled={isJoining}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              {isJoining ? <><Loader2 size={12} className="animate-spin" /> Entering…</> : <>👑 Enter Room</>}
            </button>
            <button
              onClick={() => onCloseRoom?.(room.room_id)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              title="Close and delete room"
            >
              <Trash2 size={13} /> Close
            </button>
          </>
        ) : isParticipant ? (
          <>
            <button
              onClick={onEnter || onJoin}
              disabled={isJoining}
              className="flex-1 py-2.5 bg-[#2d6a4f] hover:bg-[#245840] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              {isJoining ? <><Loader2 size={12} className="animate-spin" /> Entering…</> : <>Enter Room</>}
            </button>
            <button
              onClick={() => onCloseRoom?.(room.room_id)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              title="Leave room"
            >
              <LeaveIcon size={13} /> Leave
            </button>
          </>
        ) : (
          <button
            onClick={onJoin}
            disabled={isFull || isJoining || room.status === "playing"}
            className="w-full py-2.5 bg-[#2d6a4f] hover:bg-[#245840] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            {isJoining ? <><Loader2 size={12} className="animate-spin" /> Joining…</> : isFull ? <><Lock size={12} /> Full</> : room.status === "playing" ? <><Clock size={12} /> In Progress</> : <><LogIn size={12} /> Join Room</>}
          </button>
        )}
      </div>
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

interface BlitzWall {
  id: string;
  wallNumber: number;
  title: string;
  question: string;
  codeSnippet?: string;
  options: { label: string; isCorrect: boolean }[];
  explanation: string;
}

const BLITZ_WALLS: BlitzWall[] = [
  {
    id: "wall_1",
    wallNumber: 1,
    title: "Barrier 1: Printing Output",
    question: "In Python, which function is used to output text to the screen console?",
    codeSnippet: "# Output greeting\n???(\"Hello, World!\")",
    options: [
      { label: "echo(\"Hello, World!\")", isCorrect: false },
      { label: "print(\"Hello, World!\")", isCorrect: true },
      { label: "console.log(\"Hello, World!\")", isCorrect: false },
      { label: "display(\"Hello, World!\")", isCorrect: false },
    ],
    explanation: "print() is Python's standard built-in function to display text or values to the console.",
  },
  {
    id: "wall_2",
    wallNumber: 2,
    title: "Barrier 2: Code Comments",
    question: "In Python, which symbol is used at the start of a single-line comment?",
    codeSnippet: "??? This is a single line comment\nx = 10",
    options: [
      { label: "// comment", isCorrect: false },
      { label: "/* comment */", isCorrect: false },
      { label: "# comment", isCorrect: true },
      { label: "<!-- comment -->", isCorrect: false },
    ],
    explanation: "# (hash symbol) starts a single-line comment in Python.",
  },
  {
    id: "wall_3",
    wallNumber: 3,
    title: "Barrier 3: List Length",
    question: "What is the return value of len([10, 20, 30]) in Python?",
    codeSnippet: "numbers = [10, 20, 30]\nprint(len(numbers))",
    options: [
      { label: "3", isCorrect: true },
      { label: "2", isCorrect: false },
      { label: "4", isCorrect: false },
      { label: "30", isCorrect: false },
    ],
    explanation: "len() counts the number of elements in the list. [10, 20, 30] contains 3 elements.",
  },
  {
    id: "wall_4",
    wallNumber: 4,
    title: "Barrier 4: Equality Check",
    question: "In Python and JavaScript, which operator checks if two values are equal?",
    codeSnippet: "x = 5\nif x ??? 5:\n    print(\"Matches!\")",
    options: [
      { label: "=", isCorrect: false },
      { label: ":=", isCorrect: false },
      { label: "!==", isCorrect: false },
      { label: "==", isCorrect: true },
    ],
    explanation: "== compares two values for equality, whereas = is used for variable assignment.",
  },
  {
    id: "wall_5",
    wallNumber: 5,
    title: "Barrier 5: Variable Reassignment",
    question: "In JavaScript, which keyword allows declaring a variable whose value can be reassigned?",
    codeSnippet: "??? score = 10;\nscore = 20; // Allowed without error!",
    options: [
      { label: "const", isCorrect: false },
      { label: "let", isCorrect: true },
      { label: "static", isCorrect: false },
      { label: "readonly", isCorrect: false },
    ],
    explanation: "let allows variable reassignment in JavaScript. const variables cannot be reassigned.",
  },
];

const MAZE_GRID_SIZE = { width: 6, height: 6 };
const MAZE_START = { x: 0, y: 0 };
const MAZE_GOAL = { x: 5, y: 5 };
const MAZE_OBSTACLES = [
  { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 },
  { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 1, y: 4 }, { x: 4, y: 4 },
];
const MAZE_CRYSTALS = [
  { id: 'c1', x: 0, y: 3, collected: false },
  { id: 'c2', x: 3, y: 1, collected: false },
  { id: 'c3', x: 5, y: 2, collected: false },
  { id: 'c4', x: 2, y: 5, collected: false },
];

function RoomPanel({
  room,
  sessions,
  roomPlayers,
  recentEvents,
  isReady,
  currentUserId,
  pet,
  profile,
  onToggleReady,
  onLeave,
  onCloseRoom,
  onLaunchGame,
  onResetMatch,
  onSubmitWall,
  onBroadcastWallBreak,
  onBroadcastProgress,
  onFinishSession,
  onCompleteMission,
}: {
  room: GameRoom;
  sessions: any[];
  roomPlayers: any[];
  recentEvents: any[];
  isReady: boolean;
  currentUserId: string;
  pet: any;
  profile: any;
  onToggleReady: () => void;
  onLeave: () => void;
  onCloseRoom: () => void;
  onLaunchGame: (payload?: any) => Promise<void>;
  onResetMatch: () => Promise<void>;
  onSubmitWall: (wallKey: string, isCorrect: boolean, wallNumber?: number) => Promise<any>;
  onBroadcastWallBreak: (wallKey: string, xpAwarded: number) => Promise<void>;
  onBroadcastProgress: (progress: number) => Promise<void>;
  onFinishSession: (totalTimeSec?: number) => Promise<void>;
  onCompleteMission: (missionId: string, xpReward: number, coinReward: number, skillRewards?: any) => Promise<any>;
}) {
  const currentUsername = profile?.username || "";
  const isHost = currentUserId ? (
    room.host_id === currentUserId ||
    (room.player_ids && room.player_ids[0] === currentUserId) ||
    Boolean(room.host_name && currentUsername && room.host_name.toLowerCase() === currentUsername.toLowerCase()) ||
    Boolean(room.name && currentUsername && room.name.toLowerCase().includes(currentUsername.toLowerCase()))
  ) : false;

  const [gameMode, setGameMode] = useState<"blitz" | "maze">("blitz");

  // Blitz state
  const [activeWallIndex, setActiveWallIndex] = useState(0);
  const [brokenWalls, setBrokenWalls] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [blitzFinished, setBlitzFinished] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);

  // Maze state
  const [mazeBlocks, setMazeBlocks] = useState<VisualBlock[]>([
    { id: "m1", type: "move_down" },
    { id: "m2", type: "move_down" },
    { id: "m3", type: "move_right" },
  ]);
  const [mazeRacing, setMazeRacing] = useState(false);
  const [mazeStep, setMazeStep] = useState(0);
  const [mazeSimSteps, setMazeSimSteps] = useState<SimulationStep[]>([]);
  const [mazeFinished, setMazeFinished] = useState(false);
  const [mazeResult, setMazeResult] = useState<{ success: boolean; message: string } | null>(null);
  const mazeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when room resets to waiting
  useEffect(() => {
    if (room.status === "waiting") {
      setActiveWallIndex(0);
      setBrokenWalls([]);
      setSelectedOption(null);
      setFeedback(null);
      setBlitzFinished(false);
      setBlitzScore(0);
      setMazeFinished(false);
      setMazeStep(0);
      setMazeSimSteps([]);
      setMazeResult(null);
      setMazeRacing(false);
      if (mazeRef.current) clearInterval(mazeRef.current);
    }
  }, [room.status]);

  useEffect(() => () => {
    if (mazeRef.current) clearInterval(mazeRef.current);
  }, []);

  const handleAnswerBlitz = async (idx: number) => {
    if (blitzFinished || feedback?.correct) return;
    const currentWall = BLITZ_WALLS[activeWallIndex];
    if (!currentWall) return;

    setSelectedOption(idx);
    const isCorrect = currentWall.options[idx]?.isCorrect;

    if (isCorrect) {
      sound.playVictory();
      setBlitzScore((prev) => prev + 25);
      setBrokenWalls((prev) => [...prev, currentWall.id]);
      setFeedback({ correct: true, message: `💥 Barrier ${currentWall.wallNumber} breached! +25 XP` });

      await onBroadcastWallBreak(currentWall.id, 25);
      await onSubmitWall(currentWall.id, true, currentWall.wallNumber);
      const newProgress = Math.round(((activeWallIndex + 1) / BLITZ_WALLS.length) * 100);
      await onBroadcastProgress(newProgress);

      setTimeout(async () => {
        setSelectedOption(null);
        setFeedback(null);
        if (activeWallIndex + 1 >= BLITZ_WALLS.length) {
          setBlitzFinished(true);
          sound.playVictory();
          await onFinishSession();
          await onCompleteMission("multiplayer_blitz", 125, 50, { logic: 25, focus: 20 });
        } else {
          setActiveWallIndex((prev) => prev + 1);
        }
      }, 900);
    } else {
      sound.playError();
      setBlitzScore((prev) => Math.max(0, prev - 10));
      setFeedback({ correct: false, message: "❌ Incorrect answer! -10 Score penalty. Try again!" });
      await onSubmitWall(currentWall.id, false, currentWall.wallNumber);
      setTimeout(() => {
        setSelectedOption(null);
        setFeedback(null);
      }, 1200);
    }
  };

  const handleRunMaze = () => {
    if (mazeBlocks.length === 0) {
      sound.playError();
      return;
    }
    sound.playClick();
    setMazeRacing(true);
    setMazeResult(null);

    const sim = runDeterministicSimulation(
      MAZE_GRID_SIZE,
      MAZE_START,
      "right",
      MAZE_GOAL,
      MAZE_OBSTACLES,
      MAZE_CRYSTALS,
      [],
      mazeBlocks
    );

    setMazeSimSteps(sim.steps);
    let step = 0;
    if (mazeRef.current) clearInterval(mazeRef.current);

    mazeRef.current = setInterval(async () => {
      step++;
      if (step < sim.steps.length) {
        setMazeStep(step);
        sound.playStep();
        const progress = Math.min(100, Math.round((step / sim.steps.length) * 100));
        onBroadcastProgress(progress);
      } else {
        if (mazeRef.current) {
          clearInterval(mazeRef.current);
          mazeRef.current = null;
        }
        setMazeRacing(false);
        if (sim.success) {
          sound.playVictory();
          setMazeFinished(true);
          setMazeResult({ success: true, message: "🏆 Goal Portal Reached! Maze Solved!" });
          await onBroadcastProgress(100);
          await onFinishSession();
          await onCompleteMission("multiplayer_maze", 150, 60, { algorithm: 30, logic: 20 });
        } else {
          sound.playError();
          setMazeResult({ success: false, message: `❌ Maze Incomplete: ${sim.message}` });
        }
      }
    }, 420);
  };

  const handleResetRound = async () => {
    sound.playClick();
    setActiveWallIndex(0);
    setBrokenWalls([]);
    setBlitzFinished(false);
    setBlitzScore(0);
    setSelectedOption(null);
    setFeedback(null);
    setMazeFinished(false);
    setMazeStep(0);
    setMazeSimSteps([]);
    setMazeResult(null);
    setMazeRacing(false);
    if (mazeRef.current) clearInterval(mazeRef.current);
    await onResetMatch();
  };

  const mazeActivePos = mazeSimSteps.length > 0 && mazeSimSteps[mazeStep]
    ? mazeSimSteps[mazeStep].petPos
    : MAZE_START;
  const mazeCrystalsCollected = mazeSimSteps.length > 0 && mazeSimSteps[mazeStep]
    ? mazeSimSteps[mazeStep].crystalsCollected
    : [];

  const isMatchActive = room.status === "playing";
  const currentWall = BLITZ_WALLS[activeWallIndex] ?? BLITZ_WALLS[BLITZ_WALLS.length - 1];

  return (
    <div className="space-y-4">
      {/* Room Header Banner */}
      <div className={`rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-card ${isHost ? "bg-gradient-to-r from-[#1b382b] via-[#214736] to-[#1b382b] border-2 border-amber-400/40" : "bg-[#1b382b]"}`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMatchActive ? "bg-amber-400" : "bg-emerald-400"} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isMatchActive ? "bg-amber-400" : "bg-emerald-400"}`} />
            </span>
            <span className={`text-xs font-black uppercase tracking-widest ${isMatchActive ? "text-amber-300" : "text-emerald-300"}`}>
              {isMatchActive ? "🔥 Match In Progress" : "🟢 Waiting In Lobby"}
            </span>
            {isHost && (
              <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                👑 YOU ARE HOST
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{room.name}</h2>
          <p className="text-emerald-200 text-xs mt-1">
            {Math.max(roomPlayers.length, sessions.filter((s: any) => s.status !== "disconnected").length, 1)} / {room.max_players} players
            {room.host_name ? ` · Host: ${isHost ? "You" : room.host_name}` : ""}
            {` · Mode: ${gameMode === "blitz" ? "Logic Wall Blitz" : "Crystal Maze Sprint"}`}
          </p>
        </div>

        {/* Room Header Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isHost && (
            isMatchActive ? (
              <button
                onClick={handleResetRound}
                className="px-4 py-2 rounded-xl text-xs font-black bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RotateCcw size={13} /> Reset / Next Round
              </button>
            ) : (
              <button
                onClick={() => onLaunchGame({ mode: gameMode })}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 animate-pulse"
              >
                <Sparkles size={14} /> 🚀 Start Match
              </button>
            )
          )}

          <button
            onClick={onToggleReady}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isReady ? "bg-emerald-400 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
          >
            <CheckCircle2 size={13} /> {isReady ? "Ready!" : "Set Ready"}
          </button>

          {isHost ? (
            <button
              onClick={onCloseRoom}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Close room and return all players to lobby"
            >
              <Trash2 size={13} /> Close Room
            </button>
          ) : (
            <button
              onClick={onLeave}
              className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500/80 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LeaveIcon size={13} /> Leave Room
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector & Lobby Notification */}
      <div className="bg-white rounded-2xl p-3 border border-[#e2ece5] shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5b7566]">Challenge Mode:</span>
          <div className="flex bg-[#f4f8f5] p-1 rounded-xl border border-[#e2ece5] gap-1">
            <button
              onClick={() => { setGameMode("blitz"); sound.playClick(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${gameMode === "blitz" ? "bg-[#2d6a4f] text-white shadow-xs" : "text-[#5b7566] hover:text-[#1b382b]"}`}
            >
              <Flame size={13} /> Logic Wall Blitz
            </button>
            <button
              onClick={() => { setGameMode("maze"); sound.playClick(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${gameMode === "maze" ? "bg-[#2d6a4f] text-white shadow-xs" : "text-[#5b7566] hover:text-[#1b382b]"}`}
            >
              <Box size={13} /> Crystal Maze Sprint
            </button>
          </div>
        </div>

        {!isMatchActive && (
          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
            {isHost ? (
              <>💡 Click <strong>"Start Match"</strong> above when all players are ready to race!</>
            ) : (
              <>⏳ Waiting for host to click Start Match. You can practice below!</>
            )}
          </div>
        )}
      </div>

      {/* Live Match Race Tracker (Realtime Progress of all players) */}
      <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-amber-500" />
            <h3 className="font-extrabold text-sm text-[#1b382b]">Live Multi-Player Race Tracker</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {roomPlayers.length} Connected
            </span>
          </div>
          <span className="text-xs font-bold text-[#5b7566]">
            {isMatchActive ? "⚡ Real-time Speed" : "Waiting for Start"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {roomPlayers.map((p: any, idx: number) => {
            const isMe = p.userId === currentUserId;
            const progress = p.progress ?? 0;
            const isWinner = progress >= 100;
            return (
              <div
                key={p.userId || idx}
                className={`p-3 rounded-2xl border transition-all ${
                  isWinner
                    ? "bg-amber-50/80 border-amber-300 shadow-sm"
                    : isMe
                    ? "bg-[#f4f8f5] border-[#2d6a4f]/40"
                    : "bg-white border-[#e2ece5]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#e2ece5] flex items-center justify-center shrink-0">
                      <PetSVG type={p.petType || "fox"} stage={p.petStage || "child"} state={isWinner ? "happy" : "normal"} size={24} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-extrabold text-xs text-[#1b382b] truncate">{p.username}</span>
                        {isMe && <span className="text-[8px] bg-[#2d6a4f] text-white font-black px-1 rounded">YOU</span>}
                        {(p.userId === room.host_id || p.userId === room.player_ids?.[0]) && (
                          <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded border border-amber-200">
                            👑 Host
                          </span>
                        )}
                        {isWinner && <span className="text-[9px] font-black text-amber-600">🥇 FINISHED!</span>}
                      </div>
                      <span className="text-[9px] text-[#7a9386]">
                        {p.wallsBroken ? `${p.wallsBroken} walls · ` : ""}{p.score ?? 0} pts
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#2d6a4f] shrink-0">{progress}%</span>
                </div>
                <div className="w-full bg-[#e2ece5] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinner ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-emerald-400 to-[#2d6a4f]"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Victory Podium Modal/Card */}
      {(blitzFinished || mazeFinished) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-3xl p-6 border-2 border-amber-300 shadow-card text-center space-y-4"
        >
          <div className="text-5xl animate-bounce">🏆</div>
          <h3 className="text-2xl font-black text-[#1b382b]">Challenge Complete!</h3>
          <p className="text-xs text-[#5b7566] max-w-md mx-auto">
            Spectacular performance! You crushed the challenge, earned rewards for your pet, and synced with the arena leaderboard.
          </p>
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="bg-white px-4 py-2 rounded-2xl border border-amber-200 shadow-sm">
              <span className="text-[10px] font-bold text-[#7a9386] block">XP EARNED</span>
              <span className="text-lg font-black text-amber-600">+{gameMode === "blitz" ? 125 : 150} XP</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="text-[10px] font-bold text-[#7a9386] block">COINS EARNED</span>
              <span className="text-lg font-black text-[#2d6a4f]">+{gameMode === "blitz" ? 50 : 60} Coins</span>
            </div>
          </div>
          {isHost ? (
            <button
              onClick={handleResetRound}
              className="px-6 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 shadow-md cursor-pointer transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <RotateCcw size={16} /> Start Next Round / Play Again
            </button>
          ) : (
            <div className="text-xs text-[#7a9386] font-bold">
              Waiting for host to start the next round…
            </div>
          )}
        </motion.div>
      )}

      {/* Interactive Arena - Logic Wall Blitz */}
      {gameMode === "blitz" && !blitzFinished && (
        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#e2ece5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-amber-500" />
                <h3 className="font-black text-base text-[#1b382b]">Logic Wall Blitz</h3>
                <span className="text-xs bg-[#eaf2ec] text-[#2d6a4f] font-bold px-2 py-0.5 rounded-full">
                  Barrier {activeWallIndex + 1} of {BLITZ_WALLS.length}
                </span>
              </div>
              <p className="text-xs text-[#5b7566] mt-0.5">
                Answer each computer science & logic challenge to breach the firewall barriers!
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#7a9386] font-bold uppercase block">Your Score</span>
              <span className="text-base font-black text-amber-600">{blitzScore} XP</span>
            </div>
          </div>

          {/* Wall Visual Progress */}
          <div className="grid grid-cols-5 gap-2">
            {BLITZ_WALLS.map((w, i) => {
              const isBroken = brokenWalls.includes(w.id);
              const isCurrent = i === activeWallIndex;
              return (
                <div
                  key={w.id}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    isBroken
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : isCurrent
                      ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm animate-pulse"
                      : "bg-[#f4f8f5] border-[#e2ece5] text-[#7a9386]"
                  }`}
                >
                  <div className="text-sm">{isBroken ? "💥" : isCurrent ? "⚡" : "🔒"}</div>
                  <div className="text-[10px] font-bold mt-0.5 truncate">Wall {w.wallNumber}</div>
                </div>
              );
            })}
          </div>

          {/* Question & Interactive Choices */}
          <div className="bg-[#f4f8f5] rounded-2xl p-5 border border-[#e2ece5] space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-[#2d6a4f] tracking-wider block mb-1">
                {currentWall.title}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-[#1b382b]">
                {currentWall.question}
              </h4>
            </div>

            {currentWall.codeSnippet && (
              <pre className="bg-[#1b382b] text-emerald-300 text-xs font-mono p-3 rounded-xl overflow-x-auto border border-[#2d6a4f]/50">
                <code>{currentWall.codeSnippet}</code>
              </pre>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {currentWall.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerBlitz(idx)}
                    disabled={feedback?.correct === true}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer active:scale-98 flex items-center justify-between ${
                      isSelected
                        ? opt.isCorrect
                          ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300"
                          : "bg-rose-50 border-rose-300 text-rose-900"
                        : "bg-white hover:bg-[#eaf2ec] border-[#e2ece5] text-[#1b382b] hover:border-[#2d6a4f]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] text-[#7a9386] ml-2 shrink-0">#{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-bold text-center ${
                  feedback.correct
                    ? "bg-emerald-100 border border-emerald-300 text-emerald-900"
                    : "bg-rose-100 border border-rose-300 text-rose-900"
                }`}
              >
                {feedback.message}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Arena - Crystal Maze Sprint */}
      {gameMode === "maze" && !mazeFinished && (
        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#e2ece5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Box size={18} className="text-[#2d6a4f]" />
                <h3 className="font-black text-base text-[#1b382b]">Crystal Maze Sprint</h3>
                <span className="text-xs bg-[#eaf2ec] text-[#2d6a4f] font-bold px-2 py-0.5 rounded-full">
                  Realtime Algorithm Race
                </span>
              </div>
              <p className="text-xs text-[#5b7566] mt-0.5">
                Construct movement blocks to navigate the maze, collect crystals (+20 XP), and reach the portal!
              </p>
            </div>
            <button
              onClick={handleRunMaze}
              disabled={mazeRacing || mazeBlocks.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-[#2d6a4f] hover:from-emerald-500 hover:to-[#22533d] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Play size={14} className={mazeRacing ? "animate-spin" : ""} />
              {mazeRacing ? "Executing…" : "Run Algorithm"}
            </button>
          </div>

          {/* 3D Maze Simulation View */}
          <div className="bg-[#f4f8f5] p-3 rounded-2xl border border-[#e2ece5] overflow-hidden">
            <GameScene3D
              gridSize={MAZE_GRID_SIZE}
              startPos={MAZE_START}
              goalPos={MAZE_GOAL}
              obstacles={MAZE_OBSTACLES}
              crystals={MAZE_CRYSTALS.map((c) => ({
                x: c.x,
                y: c.y,
                collected: mazeCrystalsCollected.some((pc) => pc.x === c.x && pc.y === c.y),
              }))}
              switches={[]}
              activeStep={{
                stepIndex: mazeStep,
                petPos: mazeActivePos,
                petDir: "right",
                petAction: mazeRacing ? "move_forward" : "idle",
                crystalsCollected: mazeCrystalsCollected,
                openGates: [],
                status: mazeResult?.success ? "success" : mazeResult?.success === false ? "failed" : "running",
                message: mazeResult?.message || "",
              }}
              petType={pet?.pet_type || "fox"}
              equipped={pet?.equipped_items}
              theme="arena"
              cameraPreset="iso"
              height="280px"
            />
          </div>

          {/* Command Blocks Toolbar */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(["move_up", "move_down", "move_left", "move_right", "interact"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setMazeBlocks((prev) => [...prev, { id: `m_${Date.now()}_${Math.random()}`, type: t }]);
                      sound.playClick();
                    }}
                    disabled={mazeRacing}
                    className="px-2.5 py-1.5 bg-[#eaf2ec] hover:bg-[#dde9e0] disabled:opacity-50 border border-[#d3e2d8] text-[#2d6a4f] rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Plus size={11} /> {t.replace("move_", "").replace("_", " ")}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setMazeBlocks([]); sound.playClick(); }}
                disabled={mazeRacing}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={11} /> Clear
              </button>
            </div>

            {/* Block Sequence Strip */}
            <div className="min-h-[48px] max-h-[72px] overflow-y-auto bg-[#f4f8f5] p-2 rounded-xl border border-[#e2ece5] flex flex-wrap gap-1.5">
              {mazeBlocks.length === 0 ? (
                <span className="text-xs text-[#7a9386] py-1">Add movement blocks above to plot your route…</span>
              ) : (
                mazeBlocks.map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white border border-[#e2ece5] text-[10px] font-bold text-[#1b382b] rounded-lg flex items-center gap-1 shadow-2xs"
                  >
                    #{i + 1} {b.type.replace("move_", "")}
                    <button
                      onClick={() => setMazeBlocks((prev) => prev.filter((_, j) => j !== i))}
                      disabled={mazeRacing}
                      className="text-[#7a9386] hover:text-rose-600 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {mazeResult && (
              <div className={`p-3 rounded-xl text-xs font-bold text-center ${mazeResult.success ? "bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
                {mazeResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Players in Room & Live Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
          <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2">
            <Users size={15} className="text-[#2d6a4f]" /> Players in Room ({roomPlayers.length})
          </h3>
          <div className="space-y-2">
            {roomPlayers.length === 0 ? (
              <div className="text-center py-6 text-[#7a9386] text-xs">Connecting to room channel…</div>
            ) : (
              roomPlayers.map((p: any) => (
                <div key={p.userId} className="flex items-center gap-3 p-3 bg-[#f4f8f5] rounded-xl border border-[#e2ece5]">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#e2ece5] flex items-center justify-center">
                      <PetSVG type={p.petType || "fox"} stage={p.petStage || "child"} state="happy" size={28} />
                    </div>
                    {p.userId === currentUserId && (
                      <span className="absolute -top-1 -right-1 text-[7px] bg-[#2d6a4f] text-white font-black px-0.5 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-extrabold text-xs text-[#1b382b] truncate">{p.username}</p>
                      {(p.userId === room.host_id || p.userId === room.player_ids?.[0]) && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded border border-amber-200">
                          👑 Host
                        </span>
                      )}
                      <StatusDot status={p.status} />
                      {p.isReady && <span className="text-[8px] text-emerald-600 font-bold">✓ Ready</span>}
                    </div>
                    {p.status === "playing" && (
                      <div className="mt-1">
                        <div className="h-1 bg-[#e2ece5] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-emerald-400 rounded-full"
                            animate={{ width: `${p.progress ?? 0}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[8px] text-[#7a9386]">
                            {p.progress ?? 0}% · {p.wallsBroken ?? 0} walls
                          </span>
                          <span className="text-[8px] font-black text-amber-600">{p.score ?? 0} pts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
          <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2">
            <Zap size={15} className="text-amber-500" /> Live Room Feed
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="text-center py-6 text-[#7a9386] text-xs">Events appear as players race and breach walls…</div>
            ) : (
              recentEvents.slice(0, 20).map((evt: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 text-base">
                    {evt.type === "wall_broken"
                      ? "💥"
                      : evt.type === "player_finished"
                      ? "🏆"
                      : evt.type === "player_joined"
                      ? "👋"
                      : evt.type === "player_left"
                      ? "💨"
                      : evt.type === "player_ready"
                      ? "✅"
                      : evt.type === "host_started_game"
                      ? "🚀"
                      : evt.type === "room_reset_waiting"
                      ? "🔄"
                      : "⚡"}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-[#1b382b]">{evt.payload?.username ?? "Player"}</span>
                    <span className="text-[#5b7566]">
                      {evt.type === "wall_broken"
                        ? ` broke a firewall barrier! (+${evt.payload?.xpAwarded ?? 0} XP)`
                        : evt.type === "player_finished"
                        ? ` finished the race!${evt.payload?.isFirst ? " 🥇 Winner!" : ""}`
                        : evt.type === "player_joined"
                        ? " joined the room"
                        : evt.type === "player_left"
                        ? " left the room"
                        : evt.type === "player_ready"
                        ? ` is ${evt.payload?.isReady ? "ready" : "not ready"}`
                        : evt.type === "host_started_game"
                        ? " launched the challenge match!"
                        : evt.type === "room_reset_waiting"
                        ? " reset the room for next round"
                        : ` ${evt.type.replace(/_/g, " ")}`}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = "arena" | "live" | "leaderboard" | "bugs" | "community";

export function MultiplayerPage() {
  const { user } = useAuth();
  const { profile, pet, bugExchanges, communityProblems, contacts, solveBug, completeMission } = useGameData();
  const {
    connectionStatus, reconnectCount, isOnline,
    onlinePlayers, liveCount,
    openRooms, loadingRooms, refreshRooms,
    currentRoom, currentSession, roomPlayers, roomSessions, recentEvents,
    createAndJoinRoom, joinExistingRoom, quickMatch, leaveCurrentRoom,
    closeCurrentRoom, closeRoomById, launchGame, resetMatch, toggleReady,
    submitWall, broadcastWallBreak, broadcastProgress, finishCurrentSession,
    leaderboard, leaderboardType, loadingLb, setLeaderboardType, refreshLeaderboard,
  } = useMultiplayerRoom();

  const [activeTab, setActiveTab] = useState<Tab>("arena");
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const { friends, sendRequest, inviteToRoom, roomInvitations, respondInvite } = useFriends(onlinePlayers);

  // Authoritative combined duel opponents (real friends + contacts)
  const combinedDuelOpponents: Contact[] = [
    ...friends.map((f) => ({
      id: `friend_${f.user_id}`,
      user_id: user?.id || 'current',
      friend_user_id: f.user_id,
      friend_name: f.username,
      friend_pet_type: (f.pet_type as any) || 'fox',
      friend_pet_stage: (f.pet_stage as any) || 'child',
      status: 'accepted' as const,
      is_online: f.isOnline,
      created_at: f.friendship_since || new Date().toISOString(),
    })),
    ...contacts.filter((c) => !friends.some((f) => f.user_id === c.friend_user_id)),
  ];

  const handleAddFriendFromCard = async (targetId: string) => {
    sound.playClick();
    const res = await sendRequest(targetId);
    if (!res.success && res.error) {
      setRoomError(res.error);
    }
  };

  const handleInviteFriendToRoom = async (targetId: string) => {
    if (!currentRoom) return;
    sound.playClick();
    const res = await inviteToRoom(currentRoom.id, targetId);
    if (!res.success && res.error) {
      setRoomError(res.error);
    }
  };

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

  // Pathfinding algorithm to navigate from start to goal in duel arenas
  const findDuelPath = (
    start: GridPos,
    goal: GridPos,
    gridSize: { width: number; height: number },
    obstacles: GridObstacle[]
  ): VisualBlock[] => {
    const isBlocked = (x: number, y: number) => {
      if (x < 0 || x >= gridSize.width || y < 0 || y >= gridSize.height) return true;
      return obstacles.some((o) => o.x === x && o.y === y && (o.type === 'wall' || o.type === 'water'));
    };

    const queue: Array<{ x: number; y: number; path: VisualBlock[] }> = [{ x: start.x, y: start.y, path: [] }];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    const dirs: Array<{ type: VisualBlock['type']; dx: number; dy: number }> = [
      { type: 'move_up', dx: 0, dy: -1 },
      { type: 'move_right', dx: 1, dy: 0 },
      { type: 'move_down', dx: 0, dy: 1 },
      { type: 'move_left', dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x === goal.x && cur.y === goal.y) {
        return cur.path;
      }

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;
        if (!isBlocked(nx, ny) && !visited.has(key)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...cur.path, { id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, type: d.type }],
          });
        }
      }
    }

    // Fallback: Safe Manhattan steps
    const fallback: VisualBlock[] = [];
    let cx = start.x;
    let cy = start.y;
    for (let i = 0; i < 4; i++) {
      if (cy > goal.y && !isBlocked(cx, cy - 1)) {
        fallback.push({ id: `d_fb_${i}`, type: 'move_up' });
        cy--;
      } else if (cx < goal.x && !isBlocked(cx + 1, cy)) {
        fallback.push({ id: `d_fb_${i}`, type: 'move_right' });
        cx++;
      } else if (cy < goal.y && !isBlocked(cx, cy + 1)) {
        fallback.push({ id: `d_fb_${i}`, type: 'move_down' });
        cy++;
      } else if (cx > goal.x && !isBlocked(cx - 1, cy)) {
        fallback.push({ id: `d_fb_${i}`, type: 'move_left' });
        cx--;
      }
    }
    return fallback;
  };

  const handleOpenChallenge = (contact: Contact) => {
    sound.playClick();
    if (raceRef.current) { clearInterval(raceRef.current); raceRef.current = null; }
    const arena = getArenaForContact(contact, communityProblems);
    setSelectedOpponent(contact);

    // Calculate smart starter steps towards goal without colliding
    const smartPath = findDuelPath(arena.startPos, arena.goalPos, arena.gridSize, arena.obstacles);
    const starterBlocks = smartPath.length > 0
      ? smartPath.slice(0, 3)
      : [
          { id: 'd1', type: (arena.startPos.y > arena.goalPos.y ? 'move_up' : 'move_down') as const },
          { id: 'd2', type: (arena.startPos.x < arena.goalPos.x ? 'move_right' : 'move_up') as const },
        ];
    setDuelBlocks(starterBlocks);
    setPlayerDuelStep(0);
    setOpponentDuelStep(0);
    setPlayerSimulationSteps([]);
    setDuelResult(null);
    setDuelRacing(false);
  };

  const handleAutoRoute = () => {
    sound.playClick();
    if (!currentArena) return;
    const smartPath = findDuelPath(currentArena.startPos, currentArena.goalPos, currentArena.gridSize, currentArena.obstacles);
    if (smartPath.length > 0) {
      setDuelBlocks(smartPath);
      setDuelResult(null);
    }
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
  const playerActiveStep = playerSimulationSteps.length > 0 && playerSimulationSteps[playerDuelStep] ? playerSimulationSteps[playerDuelStep] : null;
  const playerActivePos = playerActiveStep ? playerActiveStep.petPos : currentArena?.startPos ?? { x: 0, y: 0 };
  const playerActiveDir = playerActiveStep ? playerActiveStep.petDir : currentArena?.startDir ?? "right";
  const playerCrystals = playerActiveStep ? playerActiveStep.crystalsCollected : [];

  const oppPathIndex = Math.min(opponentDuelStep, (currentArena?.botPath.length || 1) - 1);
  const opponentActivePos = currentArena && currentArena.botPath[oppPathIndex] ? currentArena.botPath[oppPathIndex] : { x: 0, y: 0 };
  
  // Calculate dynamic opponent facing direction based on next path node
  const oppNextPos = currentArena && currentArena.botPath[Math.min(oppPathIndex + 1, (currentArena?.botPath.length || 1) - 1)];
  let opponentActiveDir: Direction = currentArena?.startDir ?? "right";
  if (oppNextPos && (oppNextPos.x !== opponentActivePos.x || oppNextPos.y !== opponentActivePos.y)) {
    if (oppNextPos.x > opponentActivePos.x) opponentActiveDir = "right";
    else if (oppNextPos.x < opponentActivePos.x) opponentActiveDir = "left";
    else if (oppNextPos.y < opponentActivePos.y) opponentActiveDir = "up";
    else if (oppNextPos.y > opponentActivePos.y) opponentActiveDir = "down";
  }
  const bugActivePos = bugSimSteps.length > 0 && bugSimSteps[bugSimStepIndex] ? bugSimSteps[bugSimStepIndex].petPos : selectedBug?.grid.start ?? { x: 0, y: 0 };

  const liveStatusMap = new Map<string, LobbyPresence>(onlinePlayers.map((p) => [p.userId, p]));
  const myUserId = user?.id || profile?.id || "";
  const myUsername = profile?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "";

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
            <RoomPanel
              room={currentRoom}
              sessions={roomSessions}
              roomPlayers={roomPlayers}
              recentEvents={recentEvents}
              isReady={currentSession?.is_ready ?? false}
              currentUserId={myUserId}
              pet={pet}
              profile={profile}
              onToggleReady={toggleReady}
              onLeave={leaveCurrentRoom}
              onCloseRoom={closeCurrentRoom}
              onLaunchGame={launchGame}
              onResetMatch={resetMatch}
              onSubmitWall={submitWall}
              onBroadcastWallBreak={broadcastWallBreak}
              onBroadcastProgress={broadcastProgress}
              onFinishSession={finishCurrentSession}
              onCompleteMission={completeMission}
            />
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
                    {openRooms.map((room) => (
                      <RoomCard
                        key={room.room_id}
                        room={room}
                        currentUserId={myUserId}
                        currentUsername={myUsername}
                        onJoin={() => handleJoinRoom(room.room_id)}
                        onEnter={() => handleJoinRoom(room.room_id)}
                        onCloseRoom={closeRoomById}
                        isJoining={joiningRoomId === room.room_id}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-[#e2ece5] shadow-card space-y-3">
                <h3 className="font-extrabold text-sm text-[#1b382b] flex items-center gap-2"><Swords size={15} className="text-[#2d6a4f]" /> 1v1 Friend Duels</h3>
                <p className="text-xs text-[#5b7566]">Quick head-to-head algorithm race.</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {combinedDuelOpponents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#7a9386]">
                      No friends yet. Add friends via Friend ID to race against them!
                    </div>
                  ) : (
                    combinedDuelOpponents.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-[#f4f8f5] rounded-xl border border-[#e2ece5]">
                        <div className="relative">
                          <PetSVG type={c.friend_pet_type} stage={c.friend_pet_stage} state="happy" size={36} />
                          {c.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-xs text-[#1b382b] truncate">{c.friend_name}</p>
                          <p className="text-[9px] text-[#5b7566] capitalize">{c.friend_pet_stage} {c.friend_pet_type} · {c.is_online ? "🟢 Online" : "⚫ Offline"}</p>
                        </div>
                        <button onClick={() => handleOpenChallenge(c)} className="px-2.5 py-1.5 bg-[#2d6a4f] hover:bg-[#245840] text-white rounded-lg text-xs font-black cursor-pointer flex items-center gap-1 shadow-sm">
                          <Swords size={11} /> Duel
                        </button>
                      </div>
                    ))
                  )}
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
              {onlinePlayers.map((p) => (
                <PlayerCard
                  key={p.userId}
                  player={p}
                  currentUserId={user?.id}
                  isFriend={friends.some((f) => f.user_id === p.userId)}
                  onAddFriend={() => handleAddFriendFromCard(p.friendId || p.userId)}
                  onInvite={currentRoom ? () => handleInviteFriendToRoom(p.friendId || p.userId) : undefined}
                />
              ))}
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
              <div className="text-center"><h3 className="text-lg font-black text-[#1b382b] flex items-center justify-center gap-2"><span className="text-[#2d6a4f]">{myUsername || pet?.pet_name || "Your Pet"}</span><span className="text-[#7a9386] text-sm">VS</span><span>{selectedOpponent.friend_name}</span></h3></div>
              {currentArena && (
                <div className="bg-[#f4f8f5] p-4 rounded-2xl border border-[#e2ece5]">
                  <GameScene3D gridSize={currentArena.gridSize} startPos={currentArena.startPos} goalPos={currentArena.goalPos} obstacles={currentArena.obstacles}
                    crystals={currentArena.crystals.map(c => ({ x: c.x, y: c.y, collected: playerCrystals.some(pc => pc.x === c.x && pc.y === c.y) }))}
                    switches={currentArena.switches || []}
                    activeStep={{
                      stepIndex: playerDuelStep,
                      petPos: playerActivePos,
                      petDir: playerActiveDir,
                      petAction: duelRacing ? (playerActiveStep?.petAction || "move_forward") : "idle",
                      crystalsCollected: playerCrystals,
                      openGates: playerActiveStep?.openGates || [],
                      status: duelResult?.winner === "player" ? "success" : duelResult?.winner === "opponent" ? "failed" : "running",
                      message: playerActiveStep?.message || duelResult?.message || ""
                    }}
                    petType={pet?.pet_type || "cat"} equipped={pet?.equipped_items} theme="arena"
                    playerName={myUsername || pet?.pet_name || "You"}
                    showNameTags={true}
                    opponentPet={{ type: selectedOpponent.friend_pet_type, pos: opponentActivePos, dir: opponentActiveDir, name: selectedOpponent.friend_name }}
                    cameraPreset="iso" height="300px"
                  />
                </div>
              )}

              {/* Instructions Toolbar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1b382b] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#2d6a4f]" /> Algorithm Instructions:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleAutoRoute}
                      disabled={duelRacing}
                      title="Automatically calculate safe route to portal"
                      className="px-2.5 py-1 bg-[#eaf2ec] hover:bg-[#d8e8dc] text-[#2d6a4f] border border-[#d3e2d8] rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Sparkles size={12} /> Auto-Route
                    </button>
                    <button
                      onClick={() => setDuelBlocks([])}
                      disabled={duelRacing}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  </div>
                </div>

                {/* Move selector buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { type: 'move_up', label: 'Up ⬆' },
                    { type: 'move_down', label: 'Down ⬇' },
                    { type: 'move_left', label: 'Left ⬅' },
                    { type: 'move_right', label: 'Right ➡' },
                    { type: 'move_forward', label: 'Forward 🐾' },
                    { type: 'turn_left', label: 'Turn L ↺' },
                    { type: 'turn_right', label: 'Turn R ↻' },
                    { type: 'interact', label: 'Interact ✋' },
                  ].map(({ type, label }) => (
                    <button
                      key={type}
                      disabled={duelRacing}
                      onClick={() => setDuelBlocks(prev => [...prev, { id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, type: type as any }])}
                      className="px-2.5 py-1.5 bg-[#f4f8f5] hover:bg-[#eaf2ec] border border-[#e2ece5] hover:border-[#2d6a4f]/30 text-[#1b382b] font-extrabold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions sequence preview & Active step highlighting */}
              <div className="min-h-[52px] max-h-[88px] overflow-y-auto bg-[#f4f8f5] p-2.5 rounded-2xl border border-[#e2ece5] flex flex-wrap gap-1.5 items-center">
                {duelBlocks.length === 0 ? (
                  <span className="text-xs text-[#7a9386]">Click buttons above to add moves or tap Auto-Route…</span>
                ) : (
                  duelBlocks.map((b, i) => {
                    const isStepRunning = duelRacing && playerDuelStep === i + 1;
                    const isStepPast = duelRacing && playerDuelStep > i + 1;
                    return (
                      <span
                        key={b.id || i}
                        className={`px-2 py-1 text-[11px] font-extrabold rounded-xl border flex items-center gap-1 transition-all ${
                          isStepRunning
                            ? 'bg-[#2d6a4f] text-white border-[#1b382b] shadow-md ring-2 ring-[#2d6a4f]/50 scale-105 animate-pulse'
                            : isStepPast
                            ? 'bg-[#eaf2ec] text-[#2d6a4f] border-[#d3e2d8]'
                            : 'bg-white text-[#1b382b] border-[#e2ece5]'
                        }`}
                      >
                        <span className="text-[9px] opacity-70">#{i + 1}</span>
                        {b.type.replace('move_', '').replace('_', ' ')}
                        {!duelRacing && (
                          <button
                            onClick={() => setDuelBlocks(prev => prev.filter((_, j) => j !== i))}
                            className="text-[#7a9386] hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })
                )}
              </div>

              {/* Live Status indicator */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#f4f8f5] rounded-xl border border-[#e2ece5] text-[11px] text-[#5b7566] font-medium">
                <span>📍 Facing: <strong className="text-[#1b382b] uppercase">{playerActiveDir}</strong> · Pos: <strong className="text-[#2d6a4f]">({playerActivePos.x}, {playerActivePos.y})</strong></span>
                <span>🏁 Goal: <strong className="text-amber-700">({currentArena?.goalPos.x}, {currentArena?.goalPos.y})</strong></span>
              </div>

              {duelResult && (
                <div className={`p-4 rounded-2xl text-xs font-bold text-center ${duelResult.winner === "player" ? "bg-[#eaf2ec] border border-[#d3e2d8] text-[#2d6a4f]" : "bg-rose-50 border border-rose-200 text-rose-700"}`}>
                  <div className="text-sm font-black">{duelResult.winner === "player" ? "🏆 VICTORY!" : "⚡ RACE FINISHED"}</div>
                  <div>{duelResult.message}</div>
                  {duelResult.winner !== "player" && (
                    <div className="mt-1 text-[11px] font-normal text-rose-600">
                      💡 Tip: "Up" moves toward the goal portal, while "Down" moves toward the front edge. Tap <strong>✨ Auto-Route</strong> to see an optimal route!
                    </div>
                  )}
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
