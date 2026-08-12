-- Create the blocked_ips table (honeypot / auto-block store)
CREATE TABLE IF NOT EXISTS blocked_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    route TEXT,
    user_agent TEXT,
    hit_count INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS. No policies are added: the middleware/honeypot routes
-- talk to this table exclusively with the service role key, which
-- bypasses RLS. This keeps the block list unreadable via the anon key.
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Atomic "record a hit" upsert: inserts the IP on first sighting, or bumps
-- hit_count/last_seen on repeat sightings. Called from middleware via
-- POST /rest/v1/rpc/flag_ip_hit using the service role key.
CREATE OR REPLACE FUNCTION flag_ip_hit(
    p_ip TEXT,
    p_reason TEXT,
    p_route TEXT,
    p_user_agent TEXT
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO blocked_ips (ip, reason, route, user_agent)
    VALUES (p_ip, p_reason, p_route, p_user_agent)
    ON CONFLICT (ip) DO UPDATE SET
        hit_count = blocked_ips.hit_count + 1,
        last_seen = NOW(),
        route = EXCLUDED.route,
        user_agent = EXCLUDED.user_agent;
$$;

REVOKE ALL ON FUNCTION flag_ip_hit(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flag_ip_hit(TEXT, TEXT, TEXT, TEXT) TO service_role;
