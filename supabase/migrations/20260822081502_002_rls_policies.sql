/*
# Productivity Pet — RLS Policies

## Overview
Enables owner-scoped Row Level Security on every user-owned table.
Each user can only SELECT, INSERT, UPDATE, DELETE their own rows.
Cross-user access is blocked. The achievements catalog is readable
by all authenticated users (reference data) but writable only via
service role / migrations.

## Policy pattern
Four separate policies per user-owned table (select/insert/update/delete),
scoped TO authenticated with auth.uid() = user_id ownership checks.
Tables without a direct user_id (pet_states) scope via parent pet ownership.
*/

-- helper: ownership check on pet_states / pet_interactions via pets table
-- pet_states has pet_id only; we check the pet belongs to the user.

-- PROFILES
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PETS
DROP POLICY IF EXISTS "select_own_pets" ON pets;
CREATE POLICY "select_own_pets" ON pets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pets" ON pets;
CREATE POLICY "insert_own_pets" ON pets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pets" ON pets;
CREATE POLICY "update_own_pets" ON pets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pets" ON pets;
CREATE POLICY "delete_own_pets" ON pets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- GOALS
DROP POLICY IF EXISTS "select_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_goals" ON goals;
CREATE POLICY "update_own_goals" ON goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- TASKS
DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- FOCUS SESSIONS
DROP POLICY IF EXISTS "select_own_focus" ON focus_sessions;
CREATE POLICY "select_own_focus" ON focus_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_focus" ON focus_sessions;
CREATE POLICY "insert_own_focus" ON focus_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_focus" ON focus_sessions;
CREATE POLICY "update_own_focus" ON focus_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_focus" ON focus_sessions;
CREATE POLICY "delete_own_focus" ON focus_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRODUCTIVITY SCORES
DROP POLICY IF EXISTS "select_own_prodscores" ON productivity_scores;
CREATE POLICY "select_own_prodscores" ON productivity_scores FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_prodscores" ON productivity_scores;
CREATE POLICY "insert_own_prodscores" ON productivity_scores FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_prodscores" ON productivity_scores;
CREATE POLICY "update_own_prodscores" ON productivity_scores FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_prodscores" ON productivity_scores;
CREATE POLICY "delete_own_prodscores" ON productivity_scores FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- DAILY PRODUCTIVITY
DROP POLICY IF EXISTS "select_own_dailyprod" ON daily_productivity;
CREATE POLICY "select_own_dailyprod" ON daily_productivity FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_dailyprod" ON daily_productivity;
CREATE POLICY "insert_own_dailyprod" ON daily_productivity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_dailyprod" ON daily_productivity;
CREATE POLICY "update_own_dailyprod" ON daily_productivity FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_dailyprod" ON daily_productivity;
CREATE POLICY "delete_own_dailyprod" ON daily_productivity FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- STREAKS
DROP POLICY IF EXISTS "select_own_streaks" ON streaks;
CREATE POLICY "select_own_streaks" ON streaks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_streaks" ON streaks;
CREATE POLICY "update_own_streaks" ON streaks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PET STATES (scope via parent pet)
DROP POLICY IF EXISTS "select_own_petstates" ON pet_states;
CREATE POLICY "select_own_petstates" ON pet_states FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_states.pet_id AND pets.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_petstates" ON pet_states;
CREATE POLICY "insert_own_petstates" ON pet_states FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_states.pet_id AND pets.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_petstates" ON pet_states;
CREATE POLICY "delete_own_petstates" ON pet_states FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_states.pet_id AND pets.user_id = auth.uid()));

-- PET INTERACTIONS
DROP POLICY IF EXISTS "select_own_petinter" ON pet_interactions;
CREATE POLICY "select_own_petinter" ON pet_interactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_petinter" ON pet_interactions;
CREATE POLICY "insert_own_petinter" ON pet_interactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_petinter" ON pet_interactions;
CREATE POLICY "delete_own_petinter" ON pet_interactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- XP TRANSACTIONS
DROP POLICY IF EXISTS "select_own_xptx" ON xp_transactions;
CREATE POLICY "select_own_xptx" ON xp_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_xptx" ON xp_transactions;
CREATE POLICY "insert_own_xptx" ON xp_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_xptx" ON xp_transactions;
CREATE POLICY "delete_own_xptx" ON xp_transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ACHIEVEMENTS (reference — read by all authenticated, no direct user writes)
DROP POLICY IF EXISTS "read_achievements" ON achievements;
CREATE POLICY "read_achievements" ON achievements FOR SELECT
  TO authenticated USING (true);

-- USER ACHIEVEMENTS
DROP POLICY IF EXISTS "select_own_userach" ON user_achievements;
CREATE POLICY "select_own_userach" ON user_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_userach" ON user_achievements;
CREATE POLICY "insert_own_userach" ON user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_userach" ON user_achievements;
CREATE POLICY "delete_own_userach" ON user_achievements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "select_own_notifs" ON notifications;
CREATE POLICY "select_own_notifs" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifs" ON notifications;
CREATE POLICY "insert_own_notifs" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifs" ON notifications;
CREATE POLICY "update_own_notifs" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifs" ON notifications;
CREATE POLICY "delete_own_notifs" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRODUCTIVITY INSIGHTS
DROP POLICY IF EXISTS "select_own_insights" ON productivity_insights;
CREATE POLICY "select_own_insights" ON productivity_insights FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_insights" ON productivity_insights;
CREATE POLICY "insert_own_insights" ON productivity_insights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_insights" ON productivity_insights;
CREATE POLICY "delete_own_insights" ON productivity_insights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
