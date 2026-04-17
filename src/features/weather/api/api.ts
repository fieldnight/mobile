import Constants from 'expo-constants';
import type { WeatherData } from '../model/types';

const API_KEY = Constants.expoConfig?.extra?.WEATHER_API_KEY || '';

export const weatherApi = {
  getCurrentWeather: async (latitude: number, longitude: number): Promise<WeatherData> => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
    );
    if (!response.ok) throw new Error('날씨 API 호출 실패');

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
    };
  },
};
