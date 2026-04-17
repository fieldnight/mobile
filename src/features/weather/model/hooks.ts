import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { weatherApi } from '../api/api';
import type { WeatherData } from './types';

interface UseWeatherReturn {
  weather: WeatherData | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export const useWeather = (): UseWeatherReturn => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeather = async () => {
    setLoading(true);
    setError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      // 기본 좌표 (서울)
      let lat = 37.5665;
      let lon = 126.978;

      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = location.coords.latitude;
          lon = location.coords.longitude;
        } catch (locError) {
          console.log('Location error, using default:', locError);
        }
      }

      const data = await weatherApi.getCurrentWeather(lat, lon);
      setWeather(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('날씨 정보를 불러올 수 없습니다.');
      // 기본값 설정
      setWeather({
        temperature: 12,
        description: '맑음',
        icon: '01d',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return { weather, loading, error, refetch: fetchWeather };
};
