-- ============================================
-- Default Checklist Template v1 Seed Data
-- ============================================
-- This seed creates the standard cleaning inspection checklist
-- for all companies. Companies can customize later.

-- Note: This seed should be run per company
-- For now, we'll create it for the demo company

-- ============================================
-- 1. Create Default Template
-- ============================================

insert into public.checklist_templates (id, company_id, name, description, is_active)
select 
  gen_random_uuid(),
  c.id,
  'Standard Cleaning Inspection',
  'Default standardized cleaning inspection checklist',
  true
from public.companies c
where not exists (
  select 1 from public.checklist_templates ct
  where ct.company_id = c.id
    and ct.name = 'Standard Cleaning Inspection'
)
on conflict do nothing;

-- ============================================
-- 2. Create Template Version 1
-- ============================================

insert into public.checklist_template_versions (
  id,
  company_id,
  template_id,
  version_number,
  name,
  description,
  is_active
)
select 
  gen_random_uuid(),
  ct.company_id,
  ct.id,
  1,
  'v1.0 - Standard Cleaning Inspection',
  'Initial version of standardized cleaning inspection checklist',
  true
from public.checklist_templates ct
where ct.name = 'Standard Cleaning Inspection'
  and not exists (
    select 1 from public.checklist_template_versions ctv
    where ctv.template_id = ct.id
      and ctv.version_number = 1
  )
on conflict do nothing;

-- ============================================
-- 3. SECTION 0: META / HEADER
-- ============================================

-- arrival_time
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'meta',
  10,
  'arrival_time',
  'Arrival Time',
  'Tap to record your arrival time',
  'timestamp',
  true,
  '{}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'arrival_time'
  );

-- departure_time
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'meta',
  20,
  'departure_time',
  'Departure Time',
  'Tap to record your departure time',
  'timestamp',
  true,
  '{}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'departure_time'
  );

-- team_size
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'meta',
  30,
  'team_size',
  'Team Size',
  'How many people worked on this inspection?',
  'enum',
  true,
  '[
    {"value": "1", "label": "1 person"},
    {"value": "2", "label": "2 people"},
    {"value": "3+", "label": "3+ people"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'team_size'
  );

-- access_ok
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'meta',
  40,
  'access_ok',
  'Access OK?',
  'Was access to the site available?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'access_ok'
  );

-- access_issue_reason (conditional: only if access_ok = false)
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  conditional_logic
)
select 
  ctv.company_id,
  ctv.id,
  'meta',
  50,
  'access_issue_reason',
  'Access Issue Reason',
  'Describe the access issue',
  'text',
  false,
  '{"required_if": {"field": "access_ok", "operator": "=", "value": false}}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'access_issue_reason'
  );

-- ============================================
-- 4. SECTION 1: CORE QUALITY SCORES
-- ============================================

-- floors_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  10,
  'floors_score',
  'Floors Score',
  'Rate the overall condition of floors (1=Poor, 3=Standard, 5=Excellent)',
  'rating',
  true,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'floors_score'
  );

-- sanitary_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  20,
  'sanitary_score',
  'Sanitary/Toilets Score',
  'Rate the condition of sanitary facilities',
  'rating',
  true,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'sanitary_score'
  );

-- kitchen_social_score (nullable)
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  30,
  'kitchen_social_score',
  'Kitchen/Social Areas Score',
  'Rate kitchen and social areas (if applicable)',
  'rating',
  false,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'kitchen_social_score'
  );

-- waste_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  40,
  'waste_score',
  'Waste/Trash Score',
  'Rate waste disposal and trash areas',
  'rating',
  true,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'waste_score'
  );

-- surfaces_details_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  50,
  'surfaces_details_score',
  'Surfaces & Details Score',
  'Rate surfaces, furniture, and detail work',
  'rating',
  true,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'surfaces_details_score'
  );

-- touchpoints_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  60,
  'touchpoints_score',
  'Touchpoints Score',
  'Rate door handles, light switches, and high-touch areas',
  'rating',
  true,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'touchpoints_score'
  );

-- deviation_reason (required if any score <= 2)
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options,
  conditional_logic
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  70,
  'deviation_reason',
  'Deviation Reason',
  'Required if any score is 2 or below',
  'enum',
  false,
  '[
    {"value": "high_soiling_level", "label": "High Soiling Level"},
    {"value": "restricted_access", "label": "Restricted Access"},
    {"value": "damaged_material", "label": "Damaged Material"},
    {"value": "insufficient_time", "label": "Insufficient Time"},
    {"value": "customer_special_request", "label": "Customer Special Request"},
    {"value": "missing_material", "label": "Missing Material"},
    {"value": "other", "label": "Other"}
  ]'::jsonb,
  '{"required_if_any_score_le": 2}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'deviation_reason'
  );

-- deviation_note
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'core_quality',
  80,
  'deviation_note',
  'Deviation Note',
  'Additional details about the deviation (max 255 characters)',
  'text',
  false,
  '{"max_length": 255}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'deviation_note'
  );

-- ============================================
-- 5. SECTION 2: OPTIONAL MODULES
-- ============================================

-- Module: Sanitary
-- wc_count
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  10,
  'wc_count',
  'WC Count',
  'Number of toilet facilities',
  'integer',
  false,
  '{"min": 0}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'wc_count'
  );

-- calcification_level
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  20,
  'calcification_level',
  'Calcification Level',
  'Level of limescale/calcification',
  'enum',
  false,
  '[
    {"value": "none", "label": "None"},
    {"value": "low", "label": "Low"},
    {"value": "medium", "label": "Medium"},
    {"value": "high", "label": "High"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'calcification_level'
  );

-- odor_present
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  30,
  'odor_present',
  'Odor Present?',
  'Is there any unpleasant odor?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'odor_present'
  );

-- consumables_refilled
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  40,
  'consumables_refilled',
  'Consumables Refilled',
  'Were consumables (soap, paper, etc.) refilled?',
  'enum',
  false,
  '[
    {"value": "yes", "label": "Yes"},
    {"value": "no", "label": "No"},
    {"value": "not_applicable", "label": "Not Applicable"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'consumables_refilled'
  );

-- Module: Floors
-- floor_type
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  50,
  'floor_type',
  'Floor Type',
  'Primary floor type',
  'enum',
  false,
  '[
    {"value": "tile", "label": "Tile"},
    {"value": "pvc", "label": "PVC"},
    {"value": "carpet", "label": "Carpet"},
    {"value": "wood", "label": "Wood"},
    {"value": "mixed", "label": "Mixed"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'floor_type'
  );

-- stains_level
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  60,
  'stains_level',
  'Stains Level',
  'Level of visible stains',
  'enum',
  false,
  '[
    {"value": "none", "label": "None"},
    {"value": "low", "label": "Low"},
    {"value": "medium", "label": "Medium"},
    {"value": "high", "label": "High"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'stains_level'
  );

-- edges_corners_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  70,
  'edges_corners_score',
  'Edges & Corners Score',
  'Rate edges and corners cleaning quality',
  'rating',
  false,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'edges_corners_score'
  );

-- Module: Glass
-- glass_areas_count
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  80,
  'glass_areas_count',
  'Glass Areas Count',
  'Number of glass areas cleaned',
  'integer',
  false,
  '{"min": 0}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'glass_areas_count'
  );

-- frames_included
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  90,
  'frames_included',
  'Frames Included?',
  'Were window frames cleaned?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'frames_included'
  );

-- streak_free_score
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  100,
  'streak_free_score',
  'Streak-Free Score',
  'Rate streak-free quality',
  'rating',
  false,
  '{"min": 1, "max": 5}'::jsonb,
  '[
    {"value": 1, "label": "1 - Poor"},
    {"value": 2, "label": "2 - Below Standard"},
    {"value": 3, "label": "3 - Standard"},
    {"value": 4, "label": "4 - Good"},
    {"value": 5, "label": "5 - Excellent"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'streak_free_score'
  );

-- ladder_required
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  110,
  'ladder_required',
  'Ladder Required?',
  'Was a ladder needed for glass cleaning?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'ladder_required'
  );

-- Module: Construction Cleaning
-- coarse_dirt_present
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  120,
  'coarse_dirt_present',
  'Coarse Dirt Present?',
  'Was coarse dirt/debris present?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'coarse_dirt_present'
  );

-- dust_level
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  130,
  'dust_level',
  'Dust Level',
  'Level of dust present',
  'enum',
  false,
  '[
    {"value": "low", "label": "Low"},
    {"value": "medium", "label": "Medium"},
    {"value": "high", "label": "High"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'dust_level'
  );

-- stickers_remaining
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  140,
  'stickers_remaining',
  'Stickers Remaining?',
  'Are there stickers/protective films remaining?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'stickers_remaining'
  );

-- disposal_clarified
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'modules',
  150,
  'disposal_clarified',
  'Disposal Clarified?',
  'Was waste disposal location clarified?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'disposal_clarified'
  );

-- ============================================
-- 6. SECTION 3: EXTRAS / DEVIATIONS
-- ============================================

-- extra_tasks_performed
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  enum_options
)
select 
  ctv.company_id,
  ctv.id,
  'extras',
  10,
  'extra_tasks_performed',
  'Extra Tasks Performed',
  'Select any extra tasks that were performed',
  'multi_select',
  false,
  '[
    {"value": "extra_waste", "label": "Extra Waste"},
    {"value": "special_surfaces", "label": "Special Surfaces"},
    {"value": "stain_removal", "label": "Stain Removal"},
    {"value": "rework_required", "label": "Rework Required"}
  ]'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'extra_tasks_performed'
  );

-- extra_time_minutes
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required,
  validation_rules
)
select 
  ctv.company_id,
  ctv.id,
  'extras',
  20,
  'extra_time_minutes',
  'Extra Time (minutes)',
  'Additional time spent beyond standard',
  'integer',
  false,
  '{"min": 0}'::jsonb
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'extra_time_minutes'
  );

-- extra_material_used
insert into public.checklist_items (
  company_id,
  template_version_id,
  section,
  sort_order,
  item_key,
  label,
  help_text,
  item_type,
  required
)
select 
  ctv.company_id,
  ctv.id,
  'extras',
  30,
  'extra_material_used',
  'Extra Material Used?',
  'Was additional material used beyond standard?',
  'boolean',
  false
from public.checklist_template_versions ctv
where ctv.version_number = 1
  and not exists (
    select 1 from public.checklist_items ci
    where ci.template_version_id = ctv.id
      and ci.item_key = 'extra_material_used'
  );
