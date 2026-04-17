import { Feather } from '@expo/vector-icons';

// 날씨 아이콘 코드를 Feather 아이콘으로 변환
export const getWeatherIcon = (iconCode: string): keyof typeof Feather.glyphMap => {
  const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
    '01d': 'sun',
    '01n': 'moon',
    '02d': 'cloud',
    '02n': 'cloud',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloud',
    '04n': 'cloud',
    '09d': 'cloud-rain',
    '09n': 'cloud-rain',
    '10d': 'cloud-drizzle',
    '10n': 'cloud-drizzle',
    '11d': 'cloud-lightning',
    '11n': 'cloud-lightning',
    '13d': 'cloud-snow',
    '13n': 'cloud-snow',
    '50d': 'wind',
    '50n': 'wind',
  };
  return iconMap[iconCode] || 'cloud';
};
