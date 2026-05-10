export interface WeatherData {
  temp: number;
  wind: number;
  code: number;
  isDay: number;
}

export async function fetchCurrentWeather(coords: [number, number][]): Promise<WeatherData[]> {
  const lats = coords.map(c => c[0]).join(',');
  const lngs = coords.map(c => c[1]).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current_weather=true`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  
  const data = await res.json();
  const results: WeatherData[] = [];
  
  if (Array.isArray(data)) {
    data.forEach((d) => {
      const cw = d.current_weather;
      results.push(cw ? { temp: cw.temperature, wind: cw.windspeed, code: cw.weathercode, isDay: cw.is_day } : { temp: 0, wind: 0, code: 0, isDay: 1 });
    });
  } else if (data.current_weather) {
    const cw = data.current_weather;
    results.push({ temp: cw.temperature, wind: cw.windspeed, code: cw.weathercode, isDay: cw.is_day });
  }
  
  return results;
}
