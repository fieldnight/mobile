// Temporary local verification surface. No device control requests are made.
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChartCards } from '@/features/hive-status/components/ChartCards';
import { PeriodCard } from '@/features/hive-status/components/PeriodCard';
import { HiveControlSection } from '@/features/hive-control/components/HiveControlSection';
import { PretendardFont } from '@/components/PretendardFont';
import type { DataPoint, Period } from '@/types';

const samples: DataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const time = new Date(Date.now() - (23 - i) * 5 * 60_000);
  return {
    label: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
    internalTemperature: i === 20 ? 0 : i === 23 ? 18 : 22 + Math.sin(i * 0.6) * 3,
    externalTemperature: 8 + Math.cos(i * 0.5) * 4,
    internalHumidity: 55 + Math.sin(i * 0.4) * 9,
    externalHumidity: i === 21 ? null : 45 + Math.cos(i) * 8,
    co2: null,
    hasData: true,
  };
});
export default function HiveUiCheck() {
  const [queryClient] = useState(() => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(['hive-control', 'settings', 'ui-check'], { controls: [{ type: 'TEMPERATURE', targetValue: 25 }] });
    return client;
  });
  const [mode, setMode] = useState<'chart' | 'combined' | 'table'>('chart');
  const [period, setPeriod] = useState<Period>('일간');
  const [session, setSession] = useState(0);
  const [interacting, setInteracting] = useState(false);
  if (!__DEV__) return null;
  return <QueryClientProvider client={queryClient}>
    <ScrollView scrollEnabled={!interacting} contentContainerStyle={{ padding: 16, paddingBottom: 60, backgroundColor: '#F3F5F7' }}>
      <PretendardFont style={{ color: '#92400E', marginBottom: 12 }}>UI 확인용 샘플 · 실제 벌통 데이터 아님</PretendardFont>
      <PeriodCard period={period} onSelect={setPeriod} viewMode={mode} onViewModeChange={(next) => { setMode(next); setSession((n) => n + 1); }} weatherContent={null}>
        <ChartCards key={`${session}-${period}`} data={samples} period={period} viewMode={mode === 'combined' ? 'combined' : 'chart'} onInteractionChange={setInteracting} />
      </PeriodCard>
      <View style={{ marginTop: 20 }}><HiveControlSection controlHive="ui-check" hiveName="UI 확인용 벌통" /></View>
    </ScrollView>
  </QueryClientProvider>;
}
