// Temporary local verification surface. No device control requests are made.
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChartCards } from '@/features/hive-status/components/ChartCards';
import { PeriodCard } from '@/features/hive-status/components/PeriodCard';
import { DataTable } from '@/features/hive-status/components/DataTable';
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
    peltierDutyPct: null,
    fanHotDutyPct: null,
    fanColdDutyPct: null,
    targetTemperature: null,
    peltierCoolCurrentA: null,
    peltierHeatCurrentA: null,
    peltierMode: null,
    fanState: null,
    internalSensorValid: null,
    externalSensorValid: null,
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
  return <QueryClientProvider client={queryClient}>
    <ScrollView scrollEnabled={!interacting} contentContainerStyle={{ padding: 16, paddingBottom: 60, backgroundColor: '#F3F5F7' }}>
      <PretendardFont style={{ color: '#92400E', marginBottom: 12 }}>UI 확인용 샘플 · 실제 벌통 데이터 아님</PretendardFont>
      <PeriodCard period={period} onSelect={setPeriod} viewMode={mode} onViewModeChange={(next) => { setMode(next); setSession((n) => n + 1); }} weatherContent={null}>
        {mode === 'table' ? <DataTable data={samples} period={period} /> :
          <ChartCards key={`${session}-${period}`} data={samples} period={period} viewMode={mode === 'combined' ? 'combined' : 'chart'} onInteractionChange={setInteracting} />}
      </PeriodCard>
      <View style={{ marginTop: 20 }}>
        <PretendardFont style={{ color: '#6B7280', marginBottom: 8 }}>조작 화면 미리보기 · 실제 장치 명령은 보내지 않아요.</PretendardFont>
        <HiveControlSection controlHive="ui-check" hiveName="UI 확인용 벌통" readOnly />
      </View>
    </ScrollView>
  </QueryClientProvider>;
}
