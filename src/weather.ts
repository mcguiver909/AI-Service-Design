/** Live forecast from Open-Meteo (free, no API key, works from the browser). */
import type { WeatherKind } from './store'

export interface HourCast { h: number; temp: number; pop: number; code: number }

export interface Forecast {
  kind: WeatherKind | 'clear'
  label: string
  place: string
  temp: number
  code: number
  high: number
  low: number
  hours: HourCast[]
}

const SEOUL = { lat: 37.5882, lon: 126.9936, place: 'Seoul' }

function getPosition(): Promise<{ lat: number; lon: number; place: string }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(SEOUL)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, place: 'Your location' }),
      () => resolve(SEOUL),
      { timeout: 6000, maximumAge: 30 * 60_000 },
    )
  })
}

export function hourLabel(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh} ${ampm}`
}

/** WMO weather code → short description. */
export function codeText(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow'
  if (code >= 95) return 'Thunderstorm'
  return 'Cloudy'
}

export type CodeGroup = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'
export function codeGroup(code: number): CodeGroup {
  if (code === 0) return 'sun'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloud'
}

export async function fetchForecast(useLocation: boolean): Promise<Forecast> {
  const pos = useLocation ? await getPosition() : SEOUL
  const qs = new URLSearchParams({
    latitude: pos.lat.toFixed(3),
    longitude: pos.lon.toFixed(3),
    current: 'temperature_2m,weather_code',
    hourly: 'precipitation_probability,temperature_2m,uv_index,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '2',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`)
  if (!res.ok) throw new Error('Weather unavailable')
  const data = await res.json() as {
    current: { time: string; temperature_2m: number; weather_code: number }
    hourly: { time: string[]; precipitation_probability: (number | null)[]; temperature_2m: number[]; uv_index: (number | null)[]; weather_code: number[] }
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
  }
  // Index of the current hour in the hourly arrays (use the API's local time).
  const nowKey = data.current.time.slice(0, 13)
  let start = data.hourly.time.findIndex((t) => t.slice(0, 13) === nowKey)
  if (start < 0) start = 0
  const today = data.hourly.time[start].slice(0, 10)

  const hours: HourCast[] = []
  for (let i = start; i < Math.min(start + 8, data.hourly.time.length); i++) {
    hours.push({
      h: Number(data.hourly.time[i].slice(11, 13)),
      temp: Math.round(data.hourly.temperature_2m[i]),
      pop: Math.round(data.hourly.precipitation_probability[i] ?? 0),
      code: data.hourly.weather_code[i],
    })
  }

  // Rest of today (until 23:00) decides the packing rules.
  const rest = data.hourly.time.map((t, i) => ({ t, i })).filter(({ t, i }) => i >= start && t.slice(0, 10) === today)
  const now = Number(nowKey.slice(11, 13))
  const rain = rest.find(({ i }) => (data.hourly.precipitation_probability[i] ?? 0) >= 50 || codeGroup(data.hourly.weather_code[i]) === 'rain')
  const uv = Math.max(0, ...rest.map(({ i }) => data.hourly.uv_index[i] ?? 0))
  const high = Math.round(data.daily.temperature_2m_max[0])
  const low = Math.round(data.daily.temperature_2m_min[0])
  const restLow = Math.round(Math.min(...rest.map(({ i }) => data.hourly.temperature_2m[i]), data.current.temperature_2m))

  let kind: Forecast['kind'] = 'clear'
  let label = `No rain expected · high of ${high}°`
  if (rain) {
    const h = Number(rain.t.slice(11, 13))
    kind = 'rain'
    label = h <= now ? 'Rain now' : `Rain from ${hourLabel(h)}`
  } else if (restLow <= 3) {
    kind = 'cold'
    label = `Cold today · low of ${restLow}°`
  } else if (uv >= 6) {
    kind = 'sun'
    label = `Strong sun · UV ${Math.round(uv)}`
  }

  return {
    kind, label, place: pos.place,
    temp: Math.round(data.current.temperature_2m), code: data.current.weather_code,
    high, low, hours,
  }
}
