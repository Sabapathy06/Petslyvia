import type { PetStage, EquippedAccessories, PlayerSkills } from './game';

export type PetType = 'cat' | 'dog' | 'bunny' | 'fox' | 'panda' | 'koala' | 'hamster' | 'penguin';
export type PetState = 'energetic' | 'happy' | 'focused' | 'excited' | 'calm' | 'neutral' | 'tired' | 'sleepy' | 'recovering';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type SessionType = 'focus' | 'short_break' | 'long_break';
export type InteractionType = 'pet' | 'feed' | 'play' | 'rest' | 'encourage';

export interface Profile {
  id: string;
  email?: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role?: 'non_coder' | 'coder';
  coins: number;
  total_xp: number;
  current_level: number;
  skills: PlayerSkills;
  unlocked_areas: string[];
  coding_mode_unlocked: boolean;
  bugs_created: number;
  bugs_solved: number;
  preferred_focus_minutes?: number;
  daily_goal_tasks?: number;
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: string;
  user_id: string;
  pet_type: PetType;
  pet_name: string;
  personality: string | null;
  stage: PetStage;
  level: number;
  xp: number;
  happiness: number;
  energy: number;
  productivity_state: PetState;
  unlocked_abilities: string[];
  equipped_items: EquippedAccessories;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  equipped: boolean;
  acquired_at: string;
}

export interface MissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  completed: boolean;
  stars: number;
  best_steps: number;
  attempts: number;
  completed_at: string | null;
}

export interface Contact {
  id: string;
  user_id: string;
  friend_user_id: string;
  friend_name: string;
  friend_pet_type: PetType;
  friend_pet_stage: PetStage;
  status: 'pending' | 'accepted' | 'rejected';
  is_online?: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  category: 'adventure' | 'logic' | 'debugging' | 'creator' | 'social';
  xp_reward: number;
  coin_reward: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export type AppNotification = Notification;

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  deadline: string | null;
  progress_percentage: number;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  category: string;
  due_date: string | null;
  estimated_minutes: number | null;
  status: TaskStatus;
  completed: boolean;
  completed_at: string | null;
  xp_reward: number;
  coin_reward: number;
  created_at: string;
  updated_at: string;
  goal?: Goal | null;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  session_type: SessionType;
  planned_minutes: number | null;
  actual_minutes: number | null;
  completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProductivityScore {
  id: string;
  user_id: string;
  score_date: string;
  overall_score: number;
  task_score: number;
  priority_score: number;
  goal_score: number;
  focus_score: number;
  consistency_score: number;
  streak_score: number;
  recovery_score: number;
  workload_penalty: number;
  created_at: string;
}

export interface DailyProductivity {
  id: string;
  user_id: string;
  productivity_date: string;
  tasks_completed: number;
  tasks_total: number;
  priority_tasks_completed: number;
  focus_minutes: number;
  goals_progressed: number;
  xp_earned: number;
  coins_earned: number;
  productivity_score: number;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  weekly_consistency: number;
  created_at: string;
  updated_at: string;
}

export interface PetStateLog {
  id: string;
  pet_id: string;
  state: PetState;
  productivity_score: number;
  reason: string | null;
  calculated_at: string;
}

export interface ProductivityInsight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  message: string;
  confidence: number | null;
  created_at: string;
}

export interface CompleteTaskResult {
  xp: number;
  coins: number;
  pet_state: {
    state: PetState;
    energy: number;
    happiness: number;
    productivity_score: number;
    reason: string;
  };
}

export interface FocusSessionResult {
  xp: number;
  pet_state: {
    state: PetState;
    energy: number;
    happiness: number;
    productivity_score: number;
    reason: string;
  } | null;
}
