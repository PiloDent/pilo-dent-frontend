-- supabase/migrations/20250624_update_risk_scores.sql

-- 1) Add or replace three new columns if they don’t already exist
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS no_show_risk        numeric(5,4),
  ADD COLUMN IF NOT EXISTS perio_risk_score    numeric(5,4),
  ADD COLUMN IF NOT EXISTS compliance_score    numeric(5,4);

-- 2) Update no_show_risk = (# missed / # scheduled) over last 30 days
UPDATE patients p
SET no_show_risk = COALESCE(missed::numeric / NULLIF(scheduled,0), 0)
FROM (
  SELECT 
    patient_id,
    COUNT(*) FILTER (WHERE NOT checked_in) AS missed,
    COUNT(*) AS scheduled
  FROM appointments
  WHERE appointment_date >= current_date - INTERVAL '30 days'
  GROUP BY patient_id
) a
WHERE p.id = a.patient_id;

-- 3) Update perio_risk_score as percent of perio codes in last year
UPDATE patients p
SET perio_risk_score = COALESCE(perio::numeric / NULLIF(total,0), 0)
FROM (
  SELECT 
    th.patient_id,
    COUNT(*) FILTER (WHERE billing_code LIKE 'D%') AS perio,
    COUNT(*) AS total
  FROM treatment_history th
  WHERE th.date >= current_date - INTERVAL '1 year'
  GROUP BY th.patient_id
) t
WHERE p.id = t.patient_id;

-- 4) Update compliance_score = (# kept appts / # scheduled) last 60 days
UPDATE patients p
SET compliance_score = COALESCE(kept::numeric / NULLIF(sched,0), 0)
FROM (
  SELECT 
    patient_id,
    COUNT(*) FILTER (WHERE checked_in) AS kept,
    COUNT(*) AS sched
  FROM appointments
  WHERE appointment_date >= current_date - INTERVAL '60 days'
  GROUP BY patient_id
) c
WHERE p.id = c.patient_id;

