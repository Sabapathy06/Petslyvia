/*
# Productivity Pet — Seed Achievements

Populates the achievements reference catalog with 12 achievements.
Idempotent: uses ON CONFLICT do nothing.
*/

INSERT INTO achievements (name, description, icon, requirement_type, requirement_value) VALUES
  ('First Task', 'Complete your very first task.', 'CheckCircle2', 'tasks_completed', 1),
  ('3-Day Streak', 'Stay productive 3 days in a row.', 'Flame', 'streak', 3),
  ('7-Day Streak', 'A full week of consistent productivity!', 'Flame', 'streak', 7),
  ('10 Tasks Completed', 'Complete 10 tasks total.', 'ListTodo', 'tasks_completed', 10),
  ('Focus Master', 'Complete 5 focus sessions.', 'Target', 'focus_sessions', 5),
  ('Goal Crusher', 'Complete your first goal.', 'Trophy', 'goals_completed', 1),
  ('Productivity Burst', 'Complete 25 tasks total.', 'Zap', 'tasks_completed', 25),
  ('Consistency Champion', 'Be productive 5 days in one week.', 'CalendarCheck', 'weekly_consistency', 5),
  ('Comeback', 'Return after a break and complete a task.', 'RotateCcw', 'tasks_completed', 1),
  ('Balanced Worker', 'Take 3 recovery breaks while staying productive.', 'Scale', 'focus_sessions', 3),
  ('Level 5', 'Reach level 5.', 'Star', 'level', 5),
  ('Level 10', 'Reach level 10.', 'Star', 'level', 10)
ON CONFLICT DO NOTHING;
