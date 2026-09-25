/*
# Productivity Pet — Secure Database Functions

Implements server-side business logic as SECURITY DEFINER PL/pgSQL functions.
See 003 for full description; this is the corrected version (RETURN NEXT fix).
*/

-- =========================================================
-- award_xp (internal helper)
-- =========================================================
CREATE OR REPLACE FUNCTION award_xp(p_user_id uuid, p_source text, p_source_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_pet_id uuid;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  IF p_amount = 0 THEN RETURN; END IF;

  INSERT INTO xp_transactions (user_id, source_type, source_id, xp_amount)
  VALUES (p_user_id, p_source, p_source_id, p_amount);

  UPDATE profiles
    SET total_xp = total_xp + p_amount,
        current_level = GREATEST(1, floor((total_xp + p_amount) / 100.0)::integer + 1)
    WHERE id = p_user_id;

  SELECT id INTO v_active_pet_id FROM pets WHERE user_id = p_user_id AND is_active = true LIMIT 1;
  IF v_active_pet_id IS NOT NULL THEN
    v_new_xp := (SELECT xp + p_amount FROM pets WHERE id = v_active_pet_id);
    v_new_level := GREATEST(1, floor(v_new_xp / 100.0)::integer + 1);
    UPDATE pets SET xp = xp + p_amount, level = v_new_level WHERE id = v_active_pet_id;
  END IF;
END;
$$;

-- =========================================================
-- recalc_goal_progress
-- =========================================================
CREATE OR REPLACE FUNCTION recalc_goal_progress(p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_done integer;
  v_pct integer;
  v_user uuid;
BEGIN
  SELECT count(*) INTO v_total FROM tasks WHERE goal_id = p_goal_id;
  SELECT count(*) INTO v_done FROM tasks WHERE goal_id = p_goal_id AND completed = true;
  IF v_total > 0 THEN
    v_pct := floor((v_done::numeric / v_total) * 100)::integer;
  ELSE
    v_pct := 0;
  END IF;
  UPDATE goals SET progress_percentage = v_pct WHERE id = p_goal_id;

  SELECT user_id INTO v_user FROM goals WHERE id = p_goal_id;
  IF v_user IS NOT NULL AND v_pct >= 100 THEN
    UPDATE goals SET status = 'completed' WHERE id = p_goal_id AND status = 'active';
    UPDATE daily_productivity
      SET goals_progressed = goals_progressed + 1
      WHERE user_id = v_user AND productivity_date = current_date;
  END IF;
END;
$$;

-- =========================================================
-- update_streak
-- =========================================================
CREATE OR REPLACE FUNCTION update_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_longest integer;
  v_last_date date;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_has_today boolean;
  v_has_yesterday boolean;
  v_week_count integer;
BEGIN
  SELECT current_streak, longest_streak, last_active_date
    INTO v_current, v_longest, v_last_date
    FROM streaks WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO streaks (user_id) VALUES (p_user_id);
    v_current := 0; v_longest := 0; v_last_date := NULL;
  END IF;

  SELECT EXISTS(SELECT 1 FROM daily_productivity WHERE user_id = p_user_id AND productivity_date = v_today AND (tasks_completed > 0 OR focus_minutes > 0)) INTO v_has_today;
  SELECT EXISTS(SELECT 1 FROM daily_productivity WHERE user_id = p_user_id AND productivity_date = v_yesterday AND (tasks_completed > 0 OR focus_minutes > 0)) INTO v_has_yesterday;

  IF v_has_today THEN
    IF v_last_date IS NULL OR v_last_date = v_yesterday OR v_last_date = v_today THEN
      IF v_last_date IS DISTINCT FROM v_today THEN
        v_current := v_current + 1;
      END IF;
    ELSIF v_last_date < v_yesterday THEN
      v_current := 1;
    END IF;
    v_longest := GREATEST(v_longest, v_current);
  ELSIF v_last_date IS NOT NULL AND v_last_date < v_yesterday THEN
    v_current := 0;
  END IF;

  SELECT count(*) INTO v_week_count
    FROM daily_productivity
    WHERE user_id = p_user_id
      AND productivity_date >= v_today - 6
      AND (tasks_completed > 0 OR focus_minutes > 0);

  UPDATE streaks
    SET current_streak = v_current,
        longest_streak = v_longest,
        last_active_date = CASE WHEN v_has_today THEN v_today ELSE v_last_date END,
        weekly_consistency = v_week_count
    WHERE user_id = p_user_id;
END;
$$;

-- =========================================================
-- calculate_productivity_score
-- =========================================================
CREATE OR REPLACE FUNCTION calculate_productivity_score(p_user_id uuid, p_score_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dp daily_productivity%ROWTYPE;
  v_total_tasks integer;
  v_done_tasks integer;
  v_priority_done integer;
  v_focus_min integer;
  v_goals_prog integer;
  v_task_score integer := 0;
  v_priority_score integer := 0;
  v_goal_score integer := 0;
  v_focus_score integer := 0;
  v_consistency_score integer := 0;
  v_streak_score integer := 0;
  v_recovery_score integer := 0;
  v_workload_penalty integer := 0;
  v_overall integer := 0;
  v_current_streak integer := 0;
  v_week_count integer;
  v_overdue_count integer;
  v_has_dp boolean;
BEGIN
  SELECT * INTO v_dp FROM daily_productivity WHERE user_id = p_user_id AND productivity_date = p_score_date;
  v_has_dp := FOUND;

  IF v_has_dp THEN
    v_done_tasks := v_dp.tasks_completed;
    v_total_tasks := v_dp.tasks_total;
    v_priority_done := v_dp.priority_tasks_completed;
    v_focus_min := v_dp.focus_minutes;
    v_goals_prog := v_dp.goals_progressed;
  ELSE
    v_done_tasks := 0; v_total_tasks := 0; v_priority_done := 0; v_focus_min := 0; v_goals_prog := 0;
  END IF;

  IF v_total_tasks > 0 THEN
    v_task_score := LEAST(30, floor((v_done_tasks::numeric / v_total_tasks) * 30)::integer);
  END IF;

  v_priority_score := LEAST(20, v_priority_done * 7);
  v_goal_score := LEAST(15, v_goals_prog * 5);
  v_focus_score := LEAST(20, floor(v_focus_min::numeric / 5)::integer);

  SELECT current_streak, weekly_consistency INTO v_current_streak, v_week_count
    FROM streaks WHERE user_id = p_user_id;
  v_streak_score := LEAST(10, v_current_streak);

  SELECT count(*) INTO v_week_count
    FROM daily_productivity
    WHERE user_id = p_user_id
      AND productivity_date >= p_score_date - 6
      AND (tasks_completed > 0 OR focus_minutes > 0);
  v_consistency_score := LEAST(10, v_week_count);

  SELECT count(*) INTO v_recovery_score
    FROM focus_sessions
    WHERE user_id = p_user_id
      AND session_type IN ('short_break','long_break')
      AND completed = true
      AND date_trunc('day', completed_at) = p_score_date::timestamp;
  v_recovery_score := LEAST(10, v_recovery_score * 3);

  SELECT count(*) INTO v_overdue_count
    FROM tasks
    WHERE user_id = p_user_id
      AND completed = false
      AND due_date IS NOT NULL
      AND due_date < p_score_date;
  v_workload_penalty := LEAST(15, v_overdue_count * 3);

  v_overall := v_task_score + v_priority_score + v_goal_score + v_focus_score
    + v_consistency_score + v_streak_score + v_recovery_score - v_workload_penalty;
  v_overall := GREATEST(0, LEAST(100, v_overall));

  INSERT INTO productivity_scores
    (user_id, score_date, overall_score, task_score, priority_score, goal_score,
     focus_score, consistency_score, streak_score, recovery_score, workload_penalty)
  VALUES (p_user_id, p_score_date, v_overall, v_task_score, v_priority_score,
     v_goal_score, v_focus_score, v_consistency_score, v_streak_score, v_recovery_score, v_workload_penalty)
  ON CONFLICT (user_id, score_date) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    task_score = EXCLUDED.task_score,
    priority_score = EXCLUDED.priority_score,
    goal_score = EXCLUDED.goal_score,
    focus_score = EXCLUDED.focus_score,
    consistency_score = EXCLUDED.consistency_score,
    streak_score = EXCLUDED.streak_score,
    recovery_score = EXCLUDED.recovery_score,
    workload_penalty = EXCLUDED.workload_penalty;

  UPDATE daily_productivity SET productivity_score = v_overall
    WHERE user_id = p_user_id AND productivity_date = p_score_date;

  RETURN v_overall;
END;
$$;

-- =========================================================
-- update_pet_state
-- =========================================================
CREATE OR REPLACE FUNCTION update_pet_state(p_pet_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pet pets%ROWTYPE;
  v_owner uuid;
  v_score integer;
  v_state text;
  v_energy integer;
  v_happiness integer;
  v_reason text;
  v_today date := current_date;
  v_focus_today integer;
  v_overdue_count integer;
  v_streak int;
  v_heavy_days integer;
BEGIN
  SELECT * INTO v_pet FROM pets WHERE id = p_pet_id;
  IF NOT FOUND THEN RETURN json_build_object('error','pet not found'); END IF;
  v_owner := v_pet.user_id;

  PERFORM calculate_productivity_score(v_owner, v_today);
  SELECT overall_score INTO v_score FROM productivity_scores
    WHERE user_id = v_owner AND score_date = v_today;
  IF v_score IS NULL THEN v_score := 0; END IF;

  SELECT COALESCE(SUM(actual_minutes),0) INTO v_focus_today
    FROM focus_sessions
    WHERE user_id = v_owner AND session_type = 'focus' AND completed = true
      AND date_trunc('day', completed_at) = v_today::timestamp;

  SELECT count(*) INTO v_overdue_count
    FROM tasks WHERE user_id = v_owner AND completed = false
      AND due_date IS NOT NULL AND due_date < v_today;

  SELECT current_streak INTO v_streak FROM streaks WHERE user_id = v_owner;

  SELECT count(*) INTO v_heavy_days
    FROM daily_productivity
    WHERE user_id = v_owner
      AND productivity_date >= v_today - 2
      AND tasks_total > 6;

  v_energy := LEAST(100, 40 + v_score / 2 + LEAST(20, v_focus_today / 5));
  IF v_overdue_count > 2 THEN v_energy := v_energy - 15; END IF;
  IF v_heavy_days >= 3 THEN v_energy := v_energy - 10; END IF;
  v_energy := GREATEST(0, v_energy);

  v_happiness := LEAST(100, 50 + v_score / 3 + LEAST(20, v_streak * 3));
  v_happiness := GREATEST(0, v_happiness);

  IF v_score >= 75 AND v_focus_today >= 50 THEN
    v_state := 'energetic';
    v_reason := 'High productivity and strong focus time today. Your pet is bursting with energy!';
  ELSIF v_score >= 75 THEN
    v_state := 'excited';
    v_reason := 'Excellent productivity score today. Your pet is thrilled!';
  ELSIF v_focus_today >= 50 AND v_score >= 50 THEN
    v_state := 'focused';
    v_reason := 'You completed a great focus session. Your pet is locked in with you.';
  ELSIF v_score >= 60 THEN
    v_state := 'happy';
    v_reason := 'Solid progress today. Your pet is in a great mood.';
  ELSIF v_heavy_days >= 3 OR v_overdue_count > 3 THEN
    v_state := 'tired';
    v_reason := 'Heavy workload for several days. Consider a short break to recharge.';
  ELSIF v_score >= 35 THEN
    v_state := 'calm';
    v_reason := 'Steady, balanced day. Your pet is relaxed.';
  ELSIF v_score < 20 AND v_focus_today = 0 THEN
    v_state := 'sleepy';
    v_reason := 'Low activity today. A small task will wake your pet up.';
  ELSE
    v_state := 'neutral';
    v_reason := 'A few tasks done. Keep going to energize your pet.';
  END IF;

  IF v_state IN ('tired','sleepy') AND EXISTS(
    SELECT 1 FROM focus_sessions WHERE user_id = v_owner
      AND session_type IN ('short_break','long_break') AND completed = true
      AND date_trunc('day', completed_at) = v_today::timestamp
  ) THEN
    v_state := 'recovering';
    v_reason := 'You took healthy breaks. Your pet is recovering nicely.';
  END IF;

  UPDATE pets
    SET productivity_state = v_state,
        energy = v_energy,
        happiness = v_happiness
    WHERE id = p_pet_id;

  INSERT INTO pet_states (pet_id, state, productivity_score, reason)
    VALUES (p_pet_id, v_state, v_score, v_reason);

  RETURN json_build_object(
    'state', v_state,
    'energy', v_energy,
    'happiness', v_happiness,
    'productivity_score', v_score,
    'reason', v_reason
  );
END;
$$;

-- =========================================================
-- check_achievements (returns json array of unlocked)
-- =========================================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasks_done integer;
  v_streak int;
  v_focus_count integer;
  v_goals_done integer;
  v_level integer;
  v_today date := current_date;
  v_week_active integer;
  r record;
  v_unlocked json[] := ARRAY[]::json[];
BEGIN
  SELECT count(*) INTO v_tasks_done FROM tasks WHERE user_id = p_user_id AND completed = true;
  SELECT current_streak INTO v_streak FROM streaks WHERE user_id = p_user_id;
  SELECT count(*) INTO v_focus_count FROM focus_sessions WHERE user_id = p_user_id AND session_type = 'focus' AND completed = true;
  SELECT count(*) INTO v_goals_done FROM goals WHERE user_id = p_user_id AND status = 'completed';
  SELECT current_level INTO v_level FROM profiles WHERE id = p_user_id;
  SELECT count(*) INTO v_week_active FROM daily_productivity
    WHERE user_id = p_user_id AND productivity_date >= v_today - 6 AND (tasks_completed > 0 OR focus_minutes > 0);

  FOR r IN SELECT id, name, requirement_type, requirement_value FROM achievements LOOP
    IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = r.id) THEN
      IF (r.requirement_type = 'tasks_completed' AND v_tasks_done >= r.requirement_value)
         OR (r.requirement_type = 'streak' AND v_streak >= r.requirement_value)
         OR (r.requirement_type = 'focus_sessions' AND v_focus_count >= r.requirement_value)
         OR (r.requirement_type = 'goals_completed' AND v_goals_done >= r.requirement_value)
         OR (r.requirement_type = 'level' AND v_level >= r.requirement_value)
         OR (r.requirement_type = 'weekly_consistency' AND v_week_active >= r.requirement_value)
      THEN
        INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, r.id) ON CONFLICT DO NOTHING;
        INSERT INTO notifications (user_id, type, title, message)
          VALUES (p_user_id, 'achievement', 'Achievement unlocked!', 'You earned: ' || r.name);
        v_unlocked := array_append(v_unlocked, json_build_object('id', r.id, 'name', r.name));
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object('unlocked', to_json(v_unlocked));
END;
$$;

-- =========================================================
-- complete_task
-- =========================================================
CREATE OR REPLACE FUNCTION complete_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_owner uuid;
  v_xp integer;
  v_coins integer;
  v_pet_id uuid;
  v_pet_state json;
  v_today date := current_date;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN json_build_object('error','task not found'); END IF;
  v_owner := v_task.user_id;
  IF v_owner <> auth.uid() THEN RETURN json_build_object('error','forbidden'); END IF;
  IF v_task.completed THEN RETURN json_build_object('error','already completed'); END IF;

  v_xp := v_task.xp_reward;
  v_coins := v_task.coin_reward;

  UPDATE tasks
    SET completed = true, status = 'completed', completed_at = now()
    WHERE id = p_task_id;

  INSERT INTO daily_productivity (user_id, productivity_date, tasks_completed, tasks_total, priority_tasks_completed, xp_earned, coins_earned)
    VALUES (v_owner, v_today, 1, 0, CASE WHEN v_task.priority = 'high' THEN 1 ELSE 0 END, v_xp, v_coins)
    ON CONFLICT (user_id, productivity_date) DO UPDATE SET
      tasks_completed = daily_productivity.tasks_completed + 1,
      priority_tasks_completed = daily_productivity.priority_tasks_completed + EXCLUDED.priority_tasks_completed,
      xp_earned = daily_productivity.xp_earned + v_xp,
      coins_earned = daily_productivity.coins_earned + v_coins;

  UPDATE daily_productivity SET tasks_total = GREATEST(tasks_total, tasks_completed)
    WHERE user_id = v_owner AND productivity_date = v_today AND tasks_total = 0;

  PERFORM award_xp(v_owner, 'task_completion', p_task_id, v_xp);
  UPDATE profiles SET coins = coins + v_coins WHERE id = v_owner;

  IF v_task.goal_id IS NOT NULL THEN
    PERFORM recalc_goal_progress(v_task.goal_id);
  END IF;

  PERFORM update_streak(v_owner);
  PERFORM calculate_productivity_score(v_owner, v_today);

  SELECT id INTO v_pet_id FROM pets WHERE user_id = v_owner AND is_active = true LIMIT 1;
  IF v_pet_id IS NOT NULL THEN
    v_pet_state := update_pet_state(v_pet_id);
  ELSE
    v_pet_state := json_build_object('state','neutral');
  END IF;

  PERFORM check_achievements(v_owner);

  RETURN json_build_object(
    'xp', v_xp,
    'coins', v_coins,
    'pet_state', v_pet_state
  );
END;
$$;

-- =========================================================
-- uncomplete_task
-- =========================================================
CREATE OR REPLACE FUNCTION uncomplete_task(p_task_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_owner uuid;
  v_pet_id uuid;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN json_build_object('error','not found'); END IF;
  v_owner := v_task.user_id;
  IF v_owner <> auth.uid() THEN RETURN json_build_object('error','forbidden'); END IF;
  IF NOT v_task.completed THEN RETURN json_build_object('error','not completed'); END IF;

  UPDATE tasks SET completed = false, status = 'pending', completed_at = NULL WHERE id = p_task_id;

  UPDATE daily_productivity SET
    tasks_completed = GREATEST(0, tasks_completed - 1),
    xp_earned = GREATEST(0, xp_earned - v_task.xp_reward),
    coins_earned = GREATEST(0, coins_earned - v_task.coin_reward),
    priority_tasks_completed = GREATEST(0, priority_tasks_completed - (CASE WHEN v_task.priority='high' THEN 1 ELSE 0 END))
    WHERE user_id = v_owner AND productivity_date = date_trunc('day', v_task.completed_at)::date;

  PERFORM award_xp(v_owner, 'task_completion', p_task_id, -v_task.xp_reward);
  UPDATE profiles SET coins = GREATEST(0, coins - v_task.coin_reward) WHERE id = v_owner;

  IF v_task.goal_id IS NOT NULL THEN PERFORM recalc_goal_progress(v_task.goal_id); END IF;
  PERFORM calculate_productivity_score(v_owner, current_date);
  SELECT id INTO v_pet_id FROM pets WHERE user_id = v_owner AND is_active = true LIMIT 1;
  IF v_pet_id IS NOT NULL THEN PERFORM update_pet_state(v_pet_id); END IF;

  RETURN json_build_object('xp', -v_task.xp_reward, 'coins', -v_task.coin_reward);
END;
$$;

-- =========================================================
-- record_focus_session
-- =========================================================
CREATE OR REPLACE FUNCTION record_focus_session(p_task_id uuid, p_session_type text, p_planned integer, p_actual integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_xp integer := 0;
  v_pet_id uuid;
  v_pet_state json;
BEGIN
  IF p_session_type NOT IN ('focus','short_break','long_break') THEN
    RETURN json_build_object('error','invalid session type');
  END IF;

  INSERT INTO focus_sessions (user_id, task_id, session_type, planned_minutes, actual_minutes, completed, started_at, completed_at)
    VALUES (v_owner, p_task_id, p_session_type, p_planned, p_actual, true, now() - (p_actual || ' minutes')::interval, now());

  IF p_session_type = 'focus' AND p_actual > 0 THEN
    v_xp := LEAST(50, floor(p_actual / 5)::integer * 5);
    PERFORM award_xp(v_owner, 'focus_session', NULL, v_xp);

    INSERT INTO daily_productivity (user_id, productivity_date, focus_minutes, xp_earned)
      VALUES (v_owner, current_date, p_actual, v_xp)
      ON CONFLICT (user_id, productivity_date) DO UPDATE SET
        focus_minutes = daily_productivity.focus_minutes + p_actual,
        xp_earned = daily_productivity.xp_earned + v_xp;

    INSERT INTO notifications (user_id, type, title, message)
      VALUES (v_owner, 'focus', 'Focus session complete!', p_actual || ' minutes of focused work. Nice job!');
  ELSIF p_session_type IN ('short_break','long_break') THEN
    INSERT INTO notifications (user_id, type, title, message)
      VALUES (v_owner, 'recovery', 'Break complete', 'Nice break. You are practicing sustainable productivity.');
  END IF;

  PERFORM update_streak(v_owner);
  PERFORM calculate_productivity_score(v_owner, current_date);
  SELECT id INTO v_pet_id FROM pets WHERE user_id = v_owner AND is_active = true LIMIT 1;
  IF v_pet_id IS NOT NULL THEN v_pet_state := update_pet_state(v_pet_id); END IF;
  PERFORM check_achievements(v_owner);

  RETURN json_build_object('xp', v_xp, 'pet_state', v_pet_state);
END;
$$;

-- =========================================================
-- pet_interact
-- =========================================================
CREATE OR REPLACE FUNCTION pet_interact(p_pet_id uuid, p_interaction text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pet pets%ROWTYPE;
  v_owner uuid;
  v_energy integer;
  v_happiness integer;
BEGIN
  SELECT * INTO v_pet FROM pets WHERE id = p_pet_id;
  IF NOT FOUND THEN RETURN json_build_object('error','not found'); END IF;
  v_owner := v_pet.user_id;
  IF v_owner <> auth.uid() THEN RETURN json_build_object('error','forbidden'); END IF;

  v_energy := v_pet.energy;
  v_happiness := v_pet.happiness;

  IF p_interaction = 'pet' THEN
    v_happiness := LEAST(100, v_happiness + 3);
  ELSIF p_interaction = 'feed' THEN
    v_energy := LEAST(100, v_energy + 8);
    v_happiness := LEAST(100, v_happiness + 2);
  ELSIF p_interaction = 'play' THEN
    v_happiness := LEAST(100, v_happiness + 6);
    v_energy := GREATEST(0, v_energy - 4);
  ELSIF p_interaction = 'rest' THEN
    v_energy := LEAST(100, v_energy + 15);
  ELSIF p_interaction = 'encourage' THEN
    v_happiness := LEAST(100, v_happiness + 4);
  END IF;

  UPDATE pets SET energy = v_energy, happiness = v_happiness WHERE id = p_pet_id;
  INSERT INTO pet_interactions (user_id, pet_id, interaction_type) VALUES (v_owner, p_pet_id, p_interaction);

  RETURN json_build_object('energy', v_energy, 'happiness', v_happiness);
END;
$$;

-- =========================================================
-- Grants
-- =========================================================
GRANT EXECUTE ON FUNCTION complete_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION uncomplete_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_focus_session(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION pet_interact(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_pet_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_productivity_score(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_streak(uuid) TO authenticated;
