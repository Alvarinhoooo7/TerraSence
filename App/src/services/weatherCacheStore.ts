import AsyncStorage from '@react-native-async-storage/async-storage';
import { rememberWeather, type WeatherCacheEntry } from './weatherService';

// Almacenamiento del pronóstico reutilizable sin red (WEATHER_CACHE_POLICY). La elección y la
// reconstrucción son puras y viven en weatherService.ts; aquí sólo se lee y se escribe.

const cacheKey = (scope: string) => `@terrasense/weather_cache/${scope}`;

export async function readWeatherCache(scope: string): Promise<unknown[]> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(cacheKey(scope))) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function storeWeather(scope: string, entry: WeatherCacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(scope), JSON.stringify(rememberWeather(await readWeatherCache(scope), entry)));
  } catch { /* la caché es una ayuda: sin ella la medición sigue igual */ }
}
