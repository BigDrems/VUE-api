-- Run this ONCE in Supabase SQL Editor before the first Prisma migration.
-- Supabase usually has PostGIS pre-installed; this ensures the extension exists.

-- Step 1: Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Verify installation
SELECT PostGIS_Version();
