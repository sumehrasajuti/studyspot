-- StudySpot database schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  hours_close TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  has_wifi BOOLEAN NOT NULL DEFAULT true,
  has_outlets BOOLEAN NOT NULL DEFAULT true,
  is_quiet BOOLEAN NOT NULL DEFAULT false,
  has_whiteboard BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE occupancy_reports (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('empty', 'some_space', 'crowded', 'packed')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index used constantly by getRoomsWithOccupancy() to pull recent reports fast
CREATE INDEX idx_occupancy_reports_room_time ON occupancy_reports (room_id, reported_at DESC);

-- Seed data based on the original hackathon app's buildings (SFU Burnaby campus)

INSERT INTO buildings (name, slug, description, hours_close, latitude, longitude) VALUES
  ('Academic Quadrangle', 'aq', 'Main academic building with multiple study lounges', '11:00 PM', 49.2790, -122.9199),
  ('W.A.C. Bennett Library', 'wac', 'Main campus library with extensive study spaces', '12:00 AM', 49.2774, -122.9186),
  ('Student Union Building', 'sub', 'Student hub with lounges and group study areas', '10:00 PM', 49.2795, -122.9203),
  ('Technology and Science Complex 1', 'tsc1', 'Science building with quiet study rooms', '9:00 PM', 49.2798, -122.9175),
  ('Robert C. Brown Building', 'rcb', 'Business building with bookable group rooms', '10:00 PM', 49.2801, -122.9190);

INSERT INTO rooms (building_id, name, floor, capacity, has_wifi, has_outlets, is_quiet, has_whiteboard) VALUES
  (1, 'AQ 3153 Lounge', 3, 40, true, true, true, false),
  (1, 'AQ 5000 Lounge', 5, 25, true, true, true, true),
  (1, 'AQ North Study Hall', 2, 60, true, true, false, false),
  (2, 'WAC Silent Study Room A', 4, 30, true, true, true, false),
  (2, 'WAC Group Room 1', 2, 8, true, true, false, true),
  (2, 'WAC Main Floor Lounge', 1, 80, true, false, false, false),
  (3, 'SUB Collaboration Space', 2, 20, true, true, false, true),
  (3, 'SUB Quiet Corner', 3, 15, true, true, true, false),
  (4, 'TSC1 Study Pod A', 1, 6, true, true, true, true),
  (4, 'TSC1 Study Pod B', 1, 6, true, true, true, true),
  (5, 'RCB Bookable Room 201', 2, 10, true, true, false, true),
  (5, 'RCB Bookable Room 202', 2, 10, true, true, false, true);

-- A few sample reports so the app shows real data immediately after setup
INSERT INTO occupancy_reports (room_id, status, reported_at) VALUES
  (1, 'some_space', NOW() - INTERVAL '10 minutes'),
  (2, 'empty', NOW() - INTERVAL '25 minutes'),
  (4, 'crowded', NOW() - INTERVAL '5 minutes'),
  (5, 'packed', NOW() - INTERVAL '15 minutes'),
  (6, 'some_space', NOW() - INTERVAL '40 minutes');
