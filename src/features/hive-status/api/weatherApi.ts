import { PUBLIC_CONFIG } from "@/lib/publicConfig";
import type { TodayWeatherData, WeatherCondition, WeatherDay } from "@/types";

export function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function round1(v: number): number | null {
  return Number.isFinite(v) && v !== -99 && v !== -9
    ? Math.round(v * 10) / 10
    : null;
}

function roundInt(v: number): number | null {
  return Number.isFinite(v) && v !== -9 ? Math.round(v) : null;
}

export function parseCondition(caTot: number, rnDay: number): WeatherCondition {
  if (rnDay > 0 && rnDay !== -9) {
    return { condition: "비", icon: "cloud-rain", iconColor: "#42A5F5" };
  }

  if (caTot >= 0 && caTot !== -9) {
    if (caTot <= 2) {
      return { condition: "맑음", icon: "sun", iconColor: "#FFB300" };
    }
    if (caTot <= 5) {
      return { condition: "구름조금", icon: "cloud", iconColor: "#B0BEC5" };
    }
    if (caTot <= 8) {
      return { condition: "구름많음", icon: "cloud", iconColor: "#607D8B" };
    }
    return { condition: "흐림", icon: "cloud", iconColor: "#455A64" };
  }

  return { condition: "맑음", icon: "sun", iconColor: "#FFB300" };
}

function parseKmaLines(text: string) {
  return text.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#");
  });
}

function checkKmaError(text: string): string | null {
  if (text.includes("유효한 인증키가 아닙니다")) {
    return "KMA API 인증키가 유효하지 않습니다.";
  }

  if (!text.includes('"result"')) return null;

  try {
    const err = JSON.parse(text);
    const status = err.result?.status;
    const message = err.result?.message;

    if (status === 403) return message ?? "KMA API 호출 한도를 초과했습니다.";
    return message ?? "KMA API 오류가 발생했습니다.";
  } catch {
    return null;
  }
}

function assertKmaConfig() {
  if (!PUBLIC_CONFIG.kmaApiKey) {
    throw new Error("KMA API 인증키가 설정되지 않았습니다.");
  }
}

function kmaUrl(path: string, params: Record<string, string | number>) {
  assertKmaConfig();

  const qs = Object.entries({
    ...params,
    help: 0,
    authKey: PUBLIC_CONFIG.kmaApiKey,
  })
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
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
  const hourlyError = checkKmaError(hourlyText);
  if (hourlyError) throw new Error(hourlyError);

  const lines = parseKmaLines(hourlyText);
  if (!lines.length) return null;

  const f = lines[0].trim().split(/\s+/);

  const dailyText = await dailyRes.text();
  const dailyError = checkKmaError(dailyText);
  if (dailyError) throw new Error(dailyError);

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

  const kmaError = checkKmaError(text);
  if (kmaError) throw new Error(kmaError);

  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

  return parseKmaLines(text).reduce<WeatherDay[]>((acc, line) => {
    const f = line.trim().split(/\s+/);
    if (f.length < 39) return acc;

    const dateStr = f[0];
    const date = new Date(
      parseInt(dateStr.slice(0, 4), 10),
      parseInt(dateStr.slice(4, 6), 10) - 1,
      parseInt(dateStr.slice(6, 8), 10),
    );
    const condition = parseCondition(parseFloat(f[31]), parseFloat(f[38]));

    acc.push({
      day: DAY_NAMES[date.getDay()],
      date: `${parseInt(dateStr.slice(4, 6), 10)}/${parseInt(dateStr.slice(6, 8), 10)}`,
      high: round1(parseFloat(f[11])),
      low: round1(parseFloat(f[13])),
      humidity: roundInt(parseFloat(f[18])),
      ...condition,
      icon: condition.icon as WeatherDay["icon"],
    });
    return acc;
  }, []);
}
