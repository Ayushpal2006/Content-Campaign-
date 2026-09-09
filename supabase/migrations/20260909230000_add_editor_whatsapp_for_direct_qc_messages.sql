-- Enables a per-video direct WhatsApp link for QC change requests.
-- Values are intentionally not seeded here; populate them only after editor consent/approval.
alter table public.videos
  add column if not exists editor_whatsapp text;
