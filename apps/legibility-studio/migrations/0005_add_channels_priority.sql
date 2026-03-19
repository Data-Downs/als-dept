-- Add channel availability and priority columns for GOV.UK service catalogue
ALTER TABLE services ADD COLUMN channels_json TEXT;
ALTER TABLE services ADD COLUMN priority TEXT;
