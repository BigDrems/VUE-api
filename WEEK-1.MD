🛰️ Project LYT: Core MVP Specification (Week 1)
Author: Senior Backend Engineer

Sprint: 01 - The Movement Engine

Status: Ready for Implementation

1. System Objectives
Establish a high-frequency, low-latency location pipeline. By the end of this week, we must achieve a "verified shift" state where a driver’s GPS pings are ingested, indexed spatially, and retrievable via proximity queries.

2. Technical Stack (The "Reliability" Stack)
Runtime: Node.js 22+ (LTS) with Native ESM.

Language: TypeScript 5.x (Strict Mode).

Engine: Express.js + Socket.io (for binary-efficient pings).

Database: Supabase (PostgreSQL) + PostGIS Extension.

ORM: Prisma (for relational schema) + Raw SQL (for spatial optimization).

3. Data Architecture (Phase 1)
To ensure scalability, we separate Relational State (User/Driver) from Transient State (Live Location).

Primary Schema (Prisma)
Code snippet
enum Role { COMMUTER; DRIVER; }

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role     @default(COMMUTER)
  driver    Driver?
}

model Driver {
  id           String  @id @default(uuid())
  userId       String  @unique
  vehiclePlate String  @unique
  isVerified   Boolean @default(false)
  location     VehicleLocation?
}

model VehicleLocation {
  id        String   @id @default(uuid())
  driverId  String   @unique
  coords    Unsupported("geography(Point, 4326)") // Standard GPS (WGS84)
  isActive  Boolean  @default(false)
  updatedAt DateTime @updatedAt
  
  @@index([coords], name: "spatial_idx", type: Gist)
}
4. Engineering Tasks
Task 1: The Spatial Foundation (DB)
Action: Enable PostGIS and create a GiST Index.

Rationale: Standard B-Tree indexes cannot calculate distances. GiST allows the database to ignore 99% of Leyte and only search the 5km "bounding box" around the user.

Task 2: Handshake & Shift Verification
Endpoint: POST /api/v1/shift/start

Logic:

Validate Driver JWT.

Receive current lat/lng.

Run a Geofence Check: If distance to Terminal > 500m, reject.

Upsert VehicleLocation with isActive: true.

Task 3: The Pulse (Socket.io)
Event: driver:ping

Logic: * Avoid full database UPDATE on every ping if the delta is < 5 meters to save I/O.

On valid move, execute raw SQL:
ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography.

Task 4: Proximity Discovery (The 5km Bubble)
Endpoint: GET /api/v1/vehicles/nearby?lat=x&lng=y

SQL Logic:

SQL
SELECT driver_id, ST_AsGeoJSON(coords) 
FROM "VehicleLocation"
WHERE isActive = true 
AND ST_DWithin(coords, ST_MakePoint(user_lng, user_lat)::geography, 5000);
5. Definition of Done (DoD)
[ ] PostGIS initialized in Supabase with zero migration errors.

[ ] Driver can log in and "Start Shift" only when physically at a Leyte terminal.

[ ] Server logs GPS pings successfully every 10 seconds.

[ ] Commuter API returns only drivers within a 5km radius of a given point.

6. Senior Advice for the Team
"Remember: In real-time tracking, the database is your bottleneck. Do not log every single coordinate to a permanent history table yet. Keep the 'Live' table small and use the GiST index for all lookups. We are building a system for Leyte's commuters, not a historical archive."