// Bee activity suitability levels
export type BeeActivitySuitability = 'excellent' | 'moderate' | 'poor';

// Weather types
export interface Weather {
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  beeActivitySuitability: BeeActivitySuitability;
  suitabilityMessage: string;
}

// Weather data from API (simpler version used in weather feature)
export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}
