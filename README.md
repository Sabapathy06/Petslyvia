# 🐾 Petslyvia — 3D Cyber-Companion & Productivity Gamification RPG

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

> **Work in real life ➔ Fuel your Pet's happiness & evolve your 3D digital companion!**  
> Petslyvia combines daily task management, real-life productivity sprints, and computer science education (algorithms, visual logic, and live code editing in Python & JavaScript) with a full WebGL 3D virtual pet world.

---

## 🌟 Key Features

### 🎮 1. WebGL 3D Engine & Dynamic Camera Controls
- **Interactive 3D Stages**: Beautiful low-poly dioramas with real-time lighting, procedural particle systems, and floating platforms.
- **Dynamic Camera Presets**:
  - 📐 **Iso 3D**: Elevated 45° diorama perspective with rich depth.
  - 🎥 **Action 3D**: Dynamic forward-facing cinematic perspective.
  - ⬇️ **Down View (Top-Down)**: Bird’s-eye tactical grid overview for puzzle solving.
  - ✨ **Follow Pet**: Smooth tracking camera following your pet companion in third-person view.
- **Interactive Gestures**: Drag to orbit 360°, scroll to zoom, reset view, and toggle fullscreen 3D.

---

### 🐾 2. Pet Species, Evolution & Customization
- **8 Unique Pet Species**: Cat, Dog, Bunny, Fox, Panda, Koala, Hamster, and Penguin.
- **4 Growth Evolutionary Stages**: Infant ➔ Child ➔ Teen ➔ Adult (unlocking bigger mesh scales, stats, and abilities).
- **Equippable Accessories & Cosmetics**:
  - 🎩 **Headwear**: Wizard Hats, Crown, Caps, Bows, Bunny Ears, Top Hats.
  - 👓 **Eyewear**: Cyber Visors, Reading Glasses, Nerd Glasses, Sunglasses.
  - 🧣 **Outfits**: Capes, Scarves, Bowties, Armor Plates.
  - 👟 **Shoes & Footwear**: Running Boots, Sneakers, Golden Slippers.
- **Real-Time 2D & 3D Synchronization**: All equipped items and color schemes render simultaneously in both SVG vector art and 3D Three.js geometry.

---

### ⚡ 3. Productivity Taskbar & Pet Emotions
- **Real-Life Task Sprints**:
  - 🌱 **Easy** (`-8% Energy`, `+12% Happiness`, `+20 XP`, `+15 Coins`): Hydration, stretches, quick inbox cleans.
  - ⚡ **Medium** (`-18% Energy`, `+25% Happiness`, `+40 XP`, `+35 Coins`): 25-min Pomodoro sprints, code reviews.
  - 🔥 **Hard** (`-32% Energy`, `+50% Happiness`, `+90 XP`, `+75 Coins`): 60-min deep work, bug fixes.
  - 👑 **Complex** (`-48% Energy`, `+85% Happiness`, `+160 XP`, `+130 Coins`): Milestone architectural implementations.
- **Live Companion Expressions**:
  - ✨ *Super Hyped* (Happiness ≥ 80%)
  - 😊 *Happy & Productive* (Energy ≥ 35% & Happiness ≥ 50%)
  - 🥱 *Low Energy / Tired* (Energy < 35%)
  - 😴 *Exhausted / Sleepy* (Energy < 15%)
- **Interactive Cuddling & Reactions**:
  - Click your pet to cuddle, hear cheerful synthesized sounds, and pop floating heart particles.
  - Animated celebrations (`victory`, `cheer`, `sparkles`) upon finishing tasks.

---

### 🗺️ 4. Worlds & Game Modes

| Mode / World | Description |
| :--- | :--- |
| **🌲 Logic Forest** | Algorithmic puzzle navigation with directional controls, logic chips, and bidirectional **Python / JavaScript Code Editor**. |
| **💡 Discovery Mode** | Instant code translation revealing the real-world script executed behind visual commands. |
| **🧪 Coding Lab** | Full multi-language IDE where coders write algorithms to solve perimeter sweeps, mazes, and quantum loops. |
| **🐛 Bug Dungeon** | Break & Fix arena to diagnose faulty instruction stacks, swap bad commands, or type code directly. |
| **🏙️ Smart City & Bazaar** | Purchase food (Apples, Fish, Steaks, Carrots, Cake), elixirs, and stylish gear with earned coins. |
| **🏠 Pet Sanctuary** | 360° playground to feed, cuddle, rest, and play with your pet in 3D. |
| **🎨 Creator World** | Level designer allowing players to build custom obstacle grids, crystal targets, and publish community levels. |
| **⚔️ Bug Exchange (Arena)** | Multiplayer dual-lane racing stadium featuring community level exchange, real-time ratings, and leaderboard rankings. |
| **🏆 Skills & Badges** | Track masteries across Algorithms, Debugging, Logic, System Architecture, and Productivity streaks. |

---

### 🎵 5. Synthesized Web Audio Engine
- **100% Procedural Audio**: Built using the Web Audio API with zero external audio file dependencies.
- Synthesizes dynamic sound effects for footsteps, tile hops, crystal pickups, gate activations, snack munching, cuddle purrs, victory fanfares, and error buzzers.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tooling**: [Vite](https://vitejs.dev/)
- **3D Graphics Engine**: [Three.js](https://threejs.org/) (WebGL)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (with automatic resilient offline fallback)
- **Audio**: Web Audio API (Synthesized Oscillators & Gain Envelopes)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sabapathy06/Petslyvia.git
   cd Petslyvia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   Copy `.env.example` to `.env` if connecting to a custom Supabase instance:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *(The application automatically operates in standalone offline demo mode if credentials are not provided.)*

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📂 Project Structure

```
Petslyvia/
├── public/                  # Static assets & favicon
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── game3d/          # WebGL Three.js 3D game engines & models
│   │   │   ├── GameScene3D.tsx     # Full 3D Grid Arena with multi-angle camera
│   │   │   ├── PetMesh3D.ts        # Procedural 3D Pet species meshes & animations
│   │   │   ├── PetSanctuary3D.tsx  # 3D Pet Home & Sanctuary playground
│   │   │   └── DuelArena3D.tsx     # Multiplayer dual-lane race stadium
│   │   ├── AIGameMaster.tsx # In-game AI logic assistant & hints
│   │   ├── PetSVG.tsx       # 2D Vector companion renderer
│   │   └── Taskbar.tsx      # Persistent productivity widget with pet emotions
│   ├── data/                # Game data, missions, items, arenas, & levels
│   ├── hooks/               # Custom React hooks (useGameData, useAuth, usePetReaction)
│   ├── layouts/             # App shell navigation layout
│   ├── pages/               # Main application pages
│   │   ├── AdventurePage.tsx   # Logic Forest & Mission Arena
│   │   ├── BugDungeonPage.tsx  # Break & Fix Debugging Arena
│   │   ├── CodingLabPage.tsx   # Multi-language Coding IDE
│   │   ├── CreatorPage.tsx     # Level Editor & Publisher
│   │   ├── MultiplayerPage.tsx # Bug Exchange Arena & Community Levels
│   │   ├── PetHomePage.tsx     # Pet Sanctuary & Care
│   │   ├── ShopPage.tsx        # Bazaar Accessory Shop
│   │   └── SkillsPage.tsx      # Badges & Skill Tree Progression
│   ├── services/            # Deterministic simulation & logic engines
│   ├── types/               # TypeScript data models & schemas
│   └── utils/
│       └── audio.ts         # Procedural Web Audio synthesizer engine
├── supabase/                # Database migrations & schemas
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🎮 How to Play

1. **Adopt & Name Your Pet**: Choose from 8 unique species (Cat, Fox, Bunny, Dog, Panda, Koala, Hamster, Penguin).
2. **Fuel with Real-Life Tasks**: Open the **Productivity Taskbar** at the bottom-right and check off tasks (stretches, focus sessions, coding) to boost your pet's happiness and earn coins!
3. **Embark on Missions**:
   - Solve pathfinding puzzles in **Logic Forest**.
   - Type code or swap visual blocks in **Bug Dungeon** to fix glitches.
   - Master Python / JavaScript in **Coding Lab**.
4. **Customize & Expand**: Visit the **Bazaar Shop** to equip wizard hats, cyber visors, and capes.
5. **Create & Share**: Design your own levels in **Creator World** and compete on community tracks in the **Bug Exchange Arena**!

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

Developed by **[Sabapathy06](https://github.com/Sabapathy06)**.
Contributions and feedback are always welcome!
