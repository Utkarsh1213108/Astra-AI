
-- Satellite positions cache
CREATE TABLE public.satellite_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  norad_id INTEGER NOT NULL,
  name TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  velocity DOUBLE PRECISION,
  sat_timestamp BIGINT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sat_positions_norad ON public.satellite_positions(norad_id);
CREATE INDEX idx_sat_positions_fetched ON public.satellite_positions(fetched_at DESC);

ALTER TABLE public.satellite_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Satellite positions are publicly readable"
ON public.satellite_positions FOR SELECT USING (true);

-- TLE cache
CREATE TABLE public.satellite_tle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  norad_id INTEGER NOT NULL UNIQUE,
  name TEXT,
  tle_line1 TEXT,
  tle_line2 TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.satellite_tle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TLE data is publicly readable"
ON public.satellite_tle FOR SELECT USING (true);
