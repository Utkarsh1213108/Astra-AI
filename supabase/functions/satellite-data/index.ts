import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N2YO_API_KEY = 'L927TM-JP4PZL-UDEENP-5OLP'
const NASA_API_KEY = 'wDPma0AywybjSdDKeoJllVhufGz3YSiSviFOl1re'

// Real amateur CubeSats and well-known satellites
const TRACKED_SATELLITES = [
  { noradId: 25544, name: 'ISS (ZARYA)' },
  { noradId: 40908, name: 'LilacSat-2' },
  { noradId: 39444, name: 'FUNcube-1' },
  { noradId: 43017, name: 'MOVE-II' },
  { noradId: 47438, name: 'CAS-6' },
  { noradId: 20580, name: 'Hubble Space Telescope' },
]

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function fetchN2YOPositions(noradId: number, seconds: number = 1) {
  const url = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/0/0/0/${seconds}/&apiKey=${N2YO_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`N2YO error ${res.status}: ${await res.text()}`)
  return await res.json()
}

async function fetchN2YOTLE(noradId: number) {
  const url = `https://api.n2yo.com/rest/v1/satellite/tle/${noradId}&apiKey=${N2YO_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`N2YO TLE error ${res.status}`)
  return await res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'positions'

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (action === 'positions') {
      // Fetch live positions for all tracked satellites
      const results = await Promise.allSettled(
        TRACKED_SATELLITES.map(async (sat) => {
          try {
            const data = await fetchN2YOPositions(sat.noradId, 1)
            if (data.positions && data.positions.length > 0) {
              const pos = data.positions[0]
              // Cache to DB
              await supabase.from('satellite_positions').insert({
                norad_id: sat.noradId,
                name: data.info?.satname || sat.name,
                lat: pos.satlatitude,
                lng: pos.satlongitude,
                altitude: pos.sataltitude,
                velocity: pos.velocity || null,
                sat_timestamp: pos.timestamp,
              })
              return {
                noradId: sat.noradId,
                name: data.info?.satname || sat.name,
                lat: pos.satlatitude,
                lng: pos.satlongitude,
                altitude: pos.sataltitude,
                velocity: pos.velocity || null,
                timestamp: pos.timestamp,
              }
            }
            return null
          } catch (e) {
            console.error(`Failed to fetch ${sat.name}:`, e)
            return null
          }
        })
      )

      const positions = results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<any>).value)

      // If we got no live data, fall back to cached
      if (positions.length === 0) {
        const { data: cached } = await supabase
          .from('satellite_positions')
          .select('*')
          .order('fetched_at', { ascending: false })
          .limit(20)

        return new Response(JSON.stringify({ positions: cached || [], source: 'cache' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ positions, source: 'live' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'tle') {
      const noradId = parseInt(url.searchParams.get('norad_id') || '25544')
      const data = await fetchN2YOTLE(noradId)

      if (data.tle) {
        await supabase.from('satellite_tle').upsert({
          norad_id: noradId,
          name: data.info?.satname || '',
          tle_line1: data.tle.split('\r\n')[0] || data.tle.split('\n')[0],
          tle_line2: data.tle.split('\r\n')[1] || data.tle.split('\n')[1],
        }, { onConflict: 'norad_id' })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'neo') {
      // NASA Near-Earth Objects
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(
        `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`
      )
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
