import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const N2YO_API_KEY = Deno.env.get('N2YO_API_KEY') ?? ''
const NASA_API_KEY = Deno.env.get('NASA_API_KEY') ?? ''

// Expanded satellite list with Starlink and NOAA weather satellites
const TRACKED_SATELLITES = [
  // Space stations & flagship
  {
    noradId: 25544,
    name: 'ISS (ZARYA)',
    category: 'station',
  },
  {
    noradId: 20580,
    name: 'Hubble Space Telescope',
    category: 'science',
  },

  // Amateur CubeSats
  {
    noradId: 40908,
    name: 'LilacSat-2',
    category: 'cubesat',
  },
  {
    noradId: 39444,
    name: 'FUNcube-1',
    category: 'cubesat',
  },
  {
    noradId: 43017,
    name: 'FOX-1B (RadFxSat)',
    category: 'cubesat',
  },
  {
    noradId: 47438,
    name: 'CAS-6',
    category: 'cubesat',
  },

  // Starlink satellites
  {
    noradId: 44238,
    name: 'STARLINK-24',
    category: 'starlink',
  },
  {
    noradId: 44240,
    name: 'STARLINK-30',
    category: 'starlink',
  },
  {
    noradId: 44235,
    name: 'STARLINK-22',
    category: 'starlink',
  },
  {
    noradId: 45360,
    name: 'STARLINK-1130',
    category: 'starlink',
  },

  // NOAA weather satellites
  {
    noradId: 28654,
    name: 'NOAA 18',
    category: 'weather',
  },
  {
    noradId: 33591,
    name: 'NOAA 19',
    category: 'weather',
  },
  {
    noradId: 29499,
    name: 'NOAA 17 (METOP-related)',
    category: 'weather',
  },
  {
    noradId: 43689,
    name: 'NOAA 20 (JPSS-1)',
    category: 'weather',
  },
]

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get(
  'SUPABASE_SERVICE_ROLE_KEY',
)!

async function fetchN2YOPositions(
  noradId: number,
  seconds: number = 1,
) {
  if (!N2YO_API_KEY) {
    throw new Error('N2YO_API_KEY is not configured')
  }

  const url =
    `https://api.n2yo.com/rest/v1/satellite/positions/` +
    `${noradId}/28.6139/77.2090/0/${seconds}/` +
    `&apiKey=${N2YO_API_KEY}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(
      `N2YO error ${res.status}: ${await res.text()}`,
    )
  }

  return await res.json()
}

async function fetchN2YOTLE(
  noradId: number,
) {
  if (!N2YO_API_KEY) {
    throw new Error(
      'N2YO_API_KEY is not configured',
    )
  }

  const url =
    `https://api.n2yo.com/rest/v1/satellite/tle/` +
    `${noradId}&apiKey=${N2YO_API_KEY}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(
      `N2YO TLE error ${res.status}`,
    )
  }

  return await res.json()
}

async function fetchSatnogsMetadata(
  noradId: number,
) {
  const res = await fetch(
    `https://db.satnogs.org/api/satellites/?format=json&norad_cat_id=${noradId}`,
  )

  if (!res.ok) {
    return null
  }

  const data = await res.json()

  return data.length > 0
    ? data[0]
    : null
}

async function fetchSatnogsTransmitters(
  noradId: number,
) {
  const res = await fetch(
    `https://db.satnogs.org/api/transmitters/?format=json&norad_cat_id=${noradId}`,
  )

  if (!res.ok) {
    return []
  }

  return await res.json()
}

Deno.serve(async (req) => {
  // ------------------------------------------------------------
  // CORS PREFLIGHT
  // ------------------------------------------------------------

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const url = new URL(req.url)

    const action =
      url.searchParams.get('action') ||
      'positions'

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
    )

    // ============================================================
    // LIVE SATELLITE POSITIONS
    // ============================================================

    if (action === 'positions') {
      const results =
        await Promise.allSettled(
          TRACKED_SATELLITES.map(
            async (sat) => {
              try {
                const data =
                  await fetchN2YOPositions(
                    sat.noradId,
                    1,
                  )

                if (
                  data.positions &&
                  data.positions.length > 0
                ) {
                  const pos =
                    data.positions[0]

                  await supabase
                    .from(
                      'satellite_positions',
                    )
                    .insert({
                      norad_id:
                        sat.noradId,
                      name:
                        data.info?.satname ||
                        sat.name,
                      lat:
                        pos.satlatitude,
                      lng:
                        pos.satlongitude,
                      altitude:
                        pos.sataltitude,
                      velocity:
                        pos.velocity ||
                        null,
                      sat_timestamp:
                        pos.timestamp,
                    })

                  return {
                    noradId:
                      sat.noradId,
                    name:
                      data.info?.satname ||
                      sat.name,
                    lat:
                      pos.satlatitude,
                    lng:
                      pos.satlongitude,
                    altitude:
                      pos.sataltitude,
                    velocity:
                      pos.velocity ||
                      null,
                    timestamp:
                      pos.timestamp,
                    category:
                      sat.category,
                  }
                }

                return null
              } catch (error) {
                console.error(
                  `Failed to fetch ${sat.name}:`,
                  error,
                )

                return null
              }
            },
          ),
        )

      const positions =
        results
          .filter(
            (result) =>
              result.status ===
                'fulfilled' &&
              result.value !== null,
          )
          .map(
            (result) =>
              (
                result as PromiseFulfilledResult<any>
              ).value,
          )

      // ----------------------------------------------------------
      // FALLBACK TO DATABASE CACHE
      // ----------------------------------------------------------

      if (positions.length === 0) {
        const { data: cached } =
          await supabase
            .from(
              'satellite_positions',
            )
            .select('*')
            .order('fetched_at', {
              ascending: false,
            })
            .limit(30)

        return new Response(
          JSON.stringify({
            positions:
              cached || [],
            source: 'cache',
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          },
        )
      }

      return new Response(
        JSON.stringify({
          positions,
          source: 'live',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        },
      )
    }

    // ============================================================
    // TLE
    // ============================================================

    if (action === 'tle') {
      const noradId = parseInt(
        url.searchParams.get(
          'norad_id',
        ) || '25544',
      )

      const data =
        await fetchN2YOTLE(noradId)

      if (data.tle) {
        const lines = data.tle
          .split(/\r?\n/)
          .filter(
            (line: string) =>
              line.trim().length > 0,
          )

        await supabase
          .from('satellite_tle')
          .upsert(
            {
              norad_id: noradId,
              name:
                data.info?.satname ||
                '',
              tle_line1:
                lines[0] || '',
              tle_line2:
                lines[1] || '',
            },
            {
              onConflict:
                'norad_id',
            },
          )
      }

      return new Response(
        JSON.stringify(data),
        {
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        },
      )
    }

    // ============================================================
    // ORBIT TRAIL
    // ============================================================

    if (action === 'orbit') {
      const noradId = parseInt(
        url.searchParams.get(
          'norad_id',
        ) || '25544',
      )

      const points = parseInt(
        url.searchParams.get(
          'points',
        ) || '90',
      )

      const data =
        await fetchN2YOPositions(
          noradId,
          points,
        )

      if (
        data.positions &&
        data.positions.length > 0
      ) {
        const trail =
          data.positions.map(
            (p: any) => ({
              lat:
                p.satlatitude,
              lng:
                p.satlongitude,
              alt:
                p.sataltitude,
              timestamp:
                p.timestamp,
            }),
          )

        return new Response(
          JSON.stringify({
            noradId,
            trail,
            count:
              trail.length,
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          },
        )
      }

      return new Response(
        JSON.stringify({
          noradId,
          trail: [],
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        },
      )
    }

    // ============================================================
    // SATNOGS
    // ============================================================

    if (action === 'satnogs') {
      const noradId = parseInt(
        url.searchParams.get(
          'norad_id',
        ) || '25544',
      )

      const [
        metadata,
        transmitters,
      ] = await Promise.all([
        fetchSatnogsMetadata(
          noradId,
        ),
        fetchSatnogsTransmitters(
          noradId,
        ),
      ])

      return new Response(
        JSON.stringify({
          metadata:
            metadata || null,
          transmitters:
            transmitters || [],
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        },
      )
    }

    // ============================================================
    // NASA NEO
    // ============================================================

    if (action === 'neo') {
      if (!NASA_API_KEY) {
        throw new Error(
          'NASA_API_KEY is not configured',
        )
      }

      const today =
        new Date()
          .toISOString()
          .split('T')[0]

      const res = await fetch(
        `https://api.nasa.gov/neo/rest/v1/feed` +
          `?start_date=${today}` +
          `&end_date=${today}` +
          `&api_key=${NASA_API_KEY}`,
      )

      if (!res.ok) {
        throw new Error(
          `NASA NEO error ${res.status}: ${await res.text()}`,
        )
      }

      const data =
        await res.json()

      return new Response(
        JSON.stringify(data),
        {
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        },
      )
    }

    // ============================================================
    // UNKNOWN ACTION
    // ============================================================

    return new Response(
      JSON.stringify({
        error: 'Unknown action',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      },
    )
  } catch (error: unknown) {
    console.error(
      'Edge function error:',
      error,
    )

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error'

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type':
            'application/json',
        },
      },
    )
  }
})