# Checklist System Setup Guide

This document describes how to set up and use the standardized inspection checklist system.

## Database Setup

1. **Run the migration:**
   ```bash
   # Apply the checklist system migration
   supabase migration up
   ```

2. **Seed the default checklist template:**
   ```bash
   # Run the seed script for each company
   # This creates the default v1.0 checklist template
   psql -d your_database -f supabase/seed_checklist_v1.sql
   ```

3. **Create storage bucket for inspection files:**
   ```sql
   -- In Supabase Dashboard > Storage, create a bucket named "inspection-files"
   -- Or run via SQL:
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('inspection-files', 'inspection-files', false);
   
   -- Set up RLS policies for the bucket
   CREATE POLICY "Users can upload inspection files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'inspection-files' AND
     (storage.foldername(name))[1] = (SELECT company_id::text FROM app_users WHERE id = auth.uid())
   );
   
   CREATE POLICY "Users can view inspection files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'inspection-files' AND
     (storage.foldername(name))[1] = (SELECT company_id::text FROM app_users WHERE id = auth.uid())
   );
   
   CREATE POLICY "Users can delete inspection files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'inspection-files' AND
     (storage.foldername(name))[1] = (SELECT company_id::text FROM app_users WHERE id = auth.uid())
   );
   ```

## Checklist Structure

The checklist is organized into 5 sections:

1. **Meta Information** - Arrival/departure times, team size, access issues
2. **Quality Scores** - Core 1-5 ratings (floors, sanitary, waste, etc.)
3. **Additional Details** - Optional modules (sanitary details, floors, glass, construction)
4. **Extras & Deviations** - Extra tasks, time, materials
5. **Submit** - Final submission

## Key Features

### Validation Rules

- **Required fields** are enforced before submission
- **Deviation rules**: If any score ≤ 2, `deviation_reason` and at least one photo are required
- **Conditional fields**: Some fields only appear based on other responses

### Photo Requirements

- Photos are required when any quality score is 2 or below
- Photos can be attached to specific checklist items or to the inspection overall
- Photos are stored in Supabase Storage under `inspections/{company_id}/{inspection_id}/...`

### Versioning

- Each checklist template has versions
- Inspections reference a specific template version
- Old inspections remain valid even if the template is updated
- To update a template, create a new version (don't modify existing versions)

## API Endpoints

### GET `/api/checklist/template?version_id=...`
Get checklist template (active version by default, or specific version)

### GET `/api/checklist/responses?inspection_id=...`
Get all responses for an inspection

### POST `/api/checklist/responses`
Save responses
```json
{
  "inspection_id": "...",
  "responses": [
    {
      "checklist_item_id": "...",
      "value": 3,
      "note": "Optional note"
    }
  ]
}
```

### POST `/api/checklist/files`
Upload a file (FormData)
- `inspection_id`: string (required)
- `checklist_item_id`: string (optional)
- `file`: File (required)

### DELETE `/api/checklist/files?id=...`
Delete a file

### POST `/api/checklist/validate`
Validate inspection before submission
```json
{
  "inspection_id": "..."
}
```

### POST `/api/inspections/[id]/submit`
Submit an inspection (locks it for workers)

## Usage Flow

1. **Create Inspection** - Admin/dispatcher creates inspection, assigns checklist template version
2. **Fill Checklist** - Assigned worker fills out checklist sections
3. **Auto-save** - Responses are auto-saved as user fills them out
4. **Validation** - Before submit, validation checks required fields and deviation rules
5. **Submit** - Worker submits inspection, locks it for further edits
6. **Review** - Admin can review submitted inspections

## Customization

To customize the checklist for your company:

1. Create a new template version (don't modify v1.0)
2. Add/modify checklist items via Supabase Dashboard or API
3. Set the new version as active
4. New inspections will use the new version

## Troubleshooting

### "No checklist template assigned"
- Run the seed script to create the default template
- Ensure the template is marked as `is_active = true`
- Check that inspection creation assigns `checklist_template_version_id`

### "Photo upload failed"
- Ensure the `inspection-files` storage bucket exists
- Check RLS policies on the storage bucket
- Verify user has access to the inspection

### "Validation failed"
- Check that all required fields are filled
- If any score ≤ 2, ensure `deviation_reason` is set and at least one photo is uploaded
- Check server logs for specific validation errors
