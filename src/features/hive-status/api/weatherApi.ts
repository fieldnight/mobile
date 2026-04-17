/**
 * 기상청 API Hub (apihub.kma.go.kr) 호출 유틸
 * - fetchTodayDirect  : 현재 시각 기준 최근 3시간 관측값 + 당일 최고·최저 기온
 * - fetchWeeklyDirect : 최근 7일 일별 기상 데이터
 * - parseCondition    : 운량·강수량 → 날씨 상태·아이콘 변환
 * - 응답은 CSV 텍스트이며 공백 split으로 필드 파싱
 */

import { KMA_API_KEY } from "@/constants";
import type { TodayWeatherData, WeatherCondition, WeatherDay } from "@/types";

export function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function round1(v: number): number | null {
  return v !== -99 && v !== -9 ? Math.round(v * 10) / 10 : null;
}

function roundInt(v: number): number | null {
  return v !== -9 ? Math.round(v) : null;
}

export function parseCondition(caTot: number, rnDay: number): WeatherCondition {
  if (rnDay > 0 && rnDay !== -9)
    return { condition: "비", icon: "cloud-rain", iconColor: "#42A5F5" };
  if (caTot >= 0 && caTot !== -9) {
    if (caTot <= 2)
      return { condition: "맑음", icon: "sun", iconColor: "#FFB300" };
    if (caTot <= 5)
      return { condition: "구름조금", icon: "cloud", iconColor: "#B0BEC5" };
    if (caTot <= 8)
      return { condition: "구름많음", icon: "cloud", iconColor: "#607D8B" };
    return { condition: "흐림", icon: "cloud", iconColor: "#455A64" };
  }
  return { condition: "맑음", icon: "sun", iconColor: "#FFB300" };
}

function parseKmaLines(text: string) {
  return text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
}

function checkKmaError(text: string): string | null {
  if (!text.includes('"result"')) return null;
  try {
    const err = JSON.parse(text);
    return err.result?.status === 403
      ? "API_LIMIT"
      : (err.result?.message ?? "KMA_ERROR");
  } catch {
    return null;
  }
}

function kmaUrl(path: string, params: Record<string, string | number>) {
  const qs = Object.entries({ ...params, help: 0, authKey: KMA_API_KEY })
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `https://apihub.kma.go.kr/api/typ01/url/${path}?${qs}`;
}

export async function fetchTodayDirect(
  stn: number,
): Promise<TodayWeatherData | null> {
  const kst = getKstNow();
  const hours = kst.getUTCHours();
  let target = Math.floor(hours / 3) * 3;
  if (target === hours && kst.getUTCMinutes() < 30) target -= 3;
  if (target < 0) target = 0;

  const tmDate = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const tm = `${tmDate}${String(target).padStart(2, "0")}00`;

  const [hourlyRes, dailyRes] = await Promise.all([
    fetch(kmaUrl("kma_sfctm2.php", { tm, stn })),
    fetch(kmaUrl("kma_sfcdd3.php", { tm1: tmDate, tm2: tmDate, stn })),
  ]);

  const hourlyText = await hourlyRes.text();
  const kmaErr = checkKmaError(hourlyText);
  if (kmaErr) throw new Error(kmaErr);

  const lines = parseKmaLines(hourlyText);
  if (!lines.length) return null;

  const f = lines[0].trim().split(/\s+/);

  const dailyText = await dailyRes.text();
  const dailyLines = parseKmaLines(dailyText);
  let high: number | null = null;
  let low: number | null = null;
  if (dailyLines.length) {
    const df = dailyLines[0].trim().split(/\s+/);
    high = round1(parseFloat(df[11]));
    low = round1(parseFloat(df[13]));
  }

  return {
    temperature: round1(parseFloat(f[11])),
    humidity: roundInt(parseFloat(f[13])),
    high,
    low,
    ...parseCondition(parseFloat(f[25]), parseFloat(f[16])),
  };
}

export async function fetchWeeklyDirect(stn: number): Promise<WeatherDay[]> {
  const kst = getKstNow();
  const tm2 = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const weekAgo = new Date(kst.getTime() - 6 * 24 * 60 * 60 * 1000);
  const tm1 = weekAgo.toISOString().slice(0, 10).replace(/-/g, "");

  const res = await fetch(kmaUrl("kma_sfcdd3.php", { tm1, tm2, stn }));
  const text = await res.text();

  const kmaErr = checkKmaError(text);
  if (kmaErr) throw new Error(kmaErr);

  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

  return parseKmaLines(text).reduce<WeatherDay[]>((acc, line) => {
    const f = line.trim().split(/\s+/);
    if (f.length < 39) return acc;

    const dateStr = f[0];
    const date = new Date(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8)),
    );

    acc.push({
      day: DAY_NAMES[date.getDay()],
      date: `${parseInt(dateStr.slice(4, 6))}/${parseInt(dateStr.slice(6, 8))}`,
      high: round1(parseFloat(f[11])),
      low: round1(parseFloat(f[13])),
      humidity: roundInt(parseFloat(f[18])),
      ...parseCondition(parseFloat(f[31]), parseFloat(f[38])),
      icon: parseCondition(parseFloat(f[31]), parseFloat(f[38]))
        .icon as WeatherDay["icon"],
    });
    return acc;
  }, []);
}
