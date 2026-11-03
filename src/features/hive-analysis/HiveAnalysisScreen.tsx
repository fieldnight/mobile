/**
 * 벌통 AI 분석(펠티어 정온 제어 PoC 점검)
 * - 맨 위: 제어 흐름 4단계(데이터 → 목표 반영 → 모드·출력 → 온도 변화)를 한 줄로 보여주고 어디서 막히는지 알려줍니다.
 * - 단계별 점검: 규칙으로 계산한 항목과 실패·주의 시 해볼 일.
 * - PoC 시험 순서: 기록으로 확인된 시험과 남은 시험.
 * - AI 해석: 위 수치만 넘겨 원인과 다음 시험을 문장으로 받습니다.
 */
import { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { useOrderedHives, useSyncHiveList } from "@/features/hive";
import { LoadingTips } from "@/features/hive-status";
import { sendAssistantMessage } from "@/features/assistant";
import { HiveCardRail, Panel, SectionHeader, Segmented, R, T } from "@/features/hive-home";
import { analyzePoc, type Check, type CheckStatus, type Stage } from "./model/pocAnalysis";
import { buildPocPrompt } from "./model/aiPrompt";
import { useAnalysisSamples } from "./hooks/useAnalysisSamples";

const RANGE_OPTIONS = [
  { value: "1", label: "이번 시간" },
  { value: "3", label: "최근 3시간" },
  { value: "6", label: "최근 6시간" },
] as const;

const STATUS_STYLE: Record<CheckStatus, { color: string; soft: string; icon: keyof typeof Feather.glyphMap; label: string }> = {
  pass: { color: T.good, soft: T.goodSoft, icon: "check", label: "통과" },
  warn: { color: "#B45309", soft: "#FEF3E2", icon: "alert-triangle", label: "주의" },
  fail: { color: T.hot, soft: T.hotSoft, icon: "x", label: "확인 필요" },
  info: { color: T.muted, soft: T.offSoft, icon: "minus", label: "기록 없음" },
};

export default function HiveAnalysisScreen() {
  const insets = useSafeAreaInsets();
  // 아래로 스크롤하면 하단 탭바를 숨기고, 위로 당기면 다시 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  useSyncHiveList();
  const hives = useOrderedHives();
  const { selectedHiveId } = useLocalSearchParams<{ selectedHiveId?: string }>();
  const [hiveId, setHiveId] = useState(selectedHiveId ?? "");
  const hive = hives.find((item) => item.id === hiveId) ?? hives[0];
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("1");

  const data = useAnalysisSamples(hive?.id ?? "", Number(range));
  const analysis = useMemo(() => analyzePoc(data.samples, { from: data.from, to: data.to }), [data.samples, data.from, data.to]);

  const [ai, setAi] = useState<{ key: string; text: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const aiKey = `${hive?.id}-${range}-${analysis.sampleCount}`;

  const askAi = async () => {
    if (!hive || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await sendAssistantMessage({
        input: buildPocPrompt(hive.name, analysis),
        conversationId: `hive-poc-${hive.id}-${Date.now()}`,
        mode: "RAG",
      });
      setAi({ key: aiKey, text: response.answer });
    } catch {
      setAiError("AI 해석을 받지 못했어요. 잠시 뒤 다시 시도해 주세요. 위 점검 결과는 그대로 쓸 수 있어요.");
    } finally {
      setAiLoading(false);
    }
  };

  const waiting = data.loading && !data.samples.length;

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <View style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 4 }}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() => router.back()}
          style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? T.keyPressed : "transparent" })}
        >
          <Feather name="chevron-left" size={24} color={T.ink} />
        </Tap>
        <PretendardFont accessibilityRole="header" weight="bold" style={{ fontSize: 20, letterSpacing: -0.3, color: T.ink }}>
          AI 분석
        </PretendardFont>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={footerScroll.onScroll}
        scrollEventThrottle={footerScroll.scrollEventThrottle}
        refreshControl={<RefreshControl refreshing={false} onRefresh={data.refresh} />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 120, gap: 12 }}
      >
        {hives.length > 1 ? <HiveCardRail hives={hives} selectedId={hive?.id ?? ""} onSelect={setHiveId} /> : null}

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Segmented label="분석 기간" options={RANGE_OPTIONS} value={range} onChange={setRange} />

          {waiting ? (
            <Panel>
              <PretendardFont style={{ textAlign: "center", fontSize: 13, color: T.muted }}>
                10초 기록 {data.loadedHours}/{data.totalHours}시간 받음
              </PretendardFont>
              <LoadingTips />
            </Panel>
          ) : (
            <>
              <FlowPanel stages={analysis.stages} headline={analysis.headline} sampleCount={analysis.sampleCount} loading={data.loading} error={data.error} />

              {analysis.stages.map((stage, index) => (
                <StagePanel key={`${aiKey}-${stage.id}`} index={index + 1} stage={stage} />
              ))}

              <Panel>
                <SectionHeader title="PoC 시험 순서" />
                <PretendardFont style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: T.inkSoft }}>
                  기록에서 확인된 시험은 완료로 표시돼요. 남은 시험을 앱에서 진행한 뒤 다시 분석하세요.
                </PretendardFont>
                <View style={{ marginTop: 14, gap: 14 }}>
                  {analysis.protocol.map((step, index) => (
                    <View key={step.id} style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: step.done ? T.good : T.key }}>
                        {step.done ? <Feather name="check" size={15} color={T.panel} /> : (
                          <PretendardFont weight="bold" style={{ fontSize: 13, color: T.inkSoft }}>{index + 1}</PretendardFont>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <PretendardFont weight="bold" style={{ fontSize: 15, color: T.ink }}>{step.title}</PretendardFont>
                        <PretendardFont style={{ marginTop: 2, fontSize: 13, lineHeight: 19, color: T.inkSoft }}>{step.how}</PretendardFont>
                        <PretendardFont style={{ marginTop: 4, fontSize: 12.5, color: step.done ? T.good : T.muted }}>{step.evidence}</PretendardFont>
                      </View>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel>
                <SectionHeader title="개발자에게 던지는 질문" />
                <PretendardFont style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: T.inkSoft }}>
                  데이터만으로는 판단할 수 없는 부분이에요. 관찰한 근거가 있는 질문이 위에 있어요.
                </PretendardFont>
                <View style={{ marginTop: 10 }}>
                  {analysis.questions.map((q) => (
                    <View key={q.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.line }}>
                      <PretendardFont weight="semibold" style={{ fontSize: 12, color: "#2B7DA3" }}>{q.topic}</PretendardFont>
                      <PretendardFont weight="semibold" selectable style={{ marginTop: 3, fontSize: 14.5, lineHeight: 21, color: T.ink }}>{q.question}</PretendardFont>
                      <PretendardFont style={{ marginTop: 4, fontSize: 12.5, lineHeight: 18, color: T.inkSoft }}>{q.why}</PretendardFont>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel>
                <SectionHeader title="AI 해석" />
                <PretendardFont style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: T.inkSoft }}>
                  위 점검 수치와 질문을 넘겨, 놓친 위험·원인·다음 시험·추가로 재야 할 것을 날카롭게 정리해요. 참고 의견이며, 판정은 위 점검 결과가 기준이에요.
                </PretendardFont>
                {ai?.key === aiKey ? (
                  <View style={{ marginTop: 14, borderRadius: 16, padding: 16, backgroundColor: T.key }}>
                    <PretendardFont selectable style={{ fontSize: 14.5, lineHeight: 23, color: T.ink }}>{ai.text}</PretendardFont>
                  </View>
                ) : null}
                {aiError ? (
                  <PretendardFont accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: T.hot }}>{aiError}</PretendardFont>
                ) : null}
                <Tap
                  accessibilityRole="button"
                  disabled={aiLoading || !analysis.sampleCount}
                  onPress={() => void askAi()}
                  style={({ pressed }) => ({
                    marginTop: 14,
                    minHeight: 52,
                    borderRadius: R.key,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    backgroundColor: aiLoading || !analysis.sampleCount ? T.key : pressed ? "#333B45" : T.ink,
                  })}
                >
                  {aiLoading ? <ActivityIndicator color={T.inkSoft} /> : <Feather name="cpu" size={17} color={analysis.sampleCount ? T.panel : T.muted} />}
                  <PretendardFont weight="bold" style={{ fontSize: 16, color: aiLoading || !analysis.sampleCount ? T.muted : T.panel }}>
                    {aiLoading ? "해석을 만들고 있어요" : ai?.key === aiKey ? "다시 해석 받기" : "AI 해석 받기"}
                  </PretendardFont>
                </Tap>
              </Panel>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** 제어 흐름 4단계를 한 줄 사슬로 보여주는 요약. 화면의 핵심 요소입니다. */
function FlowPanel({ stages, headline, sampleCount, loading, error }: { stages: Stage[]; headline: string; sampleCount: number; loading: boolean; error: boolean }) {
  return (
    <Panel>
      <PretendardFont style={{ fontSize: 13, color: T.muted }}>목표 온도 변경부터 실제 온도 변화까지</PretendardFont>
      <PretendardFont weight="bold" style={{ marginTop: 4, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: T.ink }}>
        {headline}
      </PretendardFont>

      <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 20 }}>
        {stages.map((stage, index) => {
          const style = STATUS_STYLE[stage.status];
          return (
            <View key={stage.id} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "stretch" }}>
                <View style={{ flex: 1, height: 2, backgroundColor: index === 0 ? "transparent" : T.line }} />
                <View
                  accessible
                  accessibilityLabel={`${index + 1}단계 ${stage.title}, ${style.label}`}
                  style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: style.soft }}
                >
                  <Feather name={style.icon} size={17} color={style.color} />
                </View>
                <View style={{ flex: 1, height: 2, backgroundColor: index === stages.length - 1 ? "transparent" : T.line }} />
              </View>
              <PretendardFont weight="semibold" style={{ marginTop: 8, fontSize: 12, lineHeight: 16, color: T.ink, textAlign: "center" }}>
                {stage.title}
              </PretendardFont>
              <PretendardFont style={{ marginTop: 2, fontSize: 11.5, color: style.color }}>{style.label}</PretendardFont>
            </View>
          );
        })}
      </View>

      <PretendardFont style={{ marginTop: 16, fontSize: 12.5, color: T.muted }}>
        10초 기록 {sampleCount}건 기준{loading ? " · 나머지 기록 받는 중" : ""}{error ? " · 일부 시간대를 불러오지 못했어요" : ""}
      </PretendardFont>
    </Panel>
  );
}

function StagePanel({ index, stage }: { index: number; stage: Stage }) {
  // 문제가 있는 단계는 펼친 채로, 통과한 단계는 접어서 보여줍니다.
  const [open, setOpen] = useState(stage.status === "fail" || stage.status === "warn");
  const style = STATUS_STYLE[stage.status];
  return (
    <Panel style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
      <Tap
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({ minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, opacity: pressed ? 0.7 : 1 })}
      >
        <PretendardFont weight="bold" style={{ fontSize: 13, color: T.muted, width: 16 }}>{index}</PretendardFont>
        <View style={{ flex: 1 }}>
          <PretendardFont weight="bold" style={{ fontSize: 16, color: T.ink }}>{stage.title}</PretendardFont>
          <PretendardFont style={{ marginTop: 2, fontSize: 12.5, color: T.inkSoft }}>{stage.summary}</PretendardFont>
        </View>
        <View style={{ paddingHorizontal: 10, height: 26, justifyContent: "center", borderRadius: R.chip, backgroundColor: style.soft }}>
          <PretendardFont weight="semibold" style={{ fontSize: 12, color: style.color }}>{style.label}</PretendardFont>
        </View>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={T.muted} />
      </Tap>
      {open ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          {stage.checks.map((check, i) => <CheckRow key={check.id} check={check} first={i === 0} />)}
        </View>
      ) : null}
    </Panel>
  );
}

function CheckRow({ check, first }: { check: Check; first: boolean }) {
  const style = STATUS_STYLE[check.status];
  return (
    <View style={{ paddingVertical: 14, borderTopWidth: first ? 1 : 1, borderTopColor: T.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: style.color }} />
        <PretendardFont weight="semibold" style={{ flex: 1, fontSize: 14.5, color: T.ink }}>{check.title}</PretendardFont>
        <PretendardFont weight="bold" style={{ fontSize: 14.5, color: check.status === "info" ? T.inkSoft : style.color, fontVariant: ["tabular-nums"] }}>
          {check.value}
        </PretendardFont>
      </View>
      <PretendardFont style={{ marginTop: 6, marginLeft: 16, fontSize: 12.5, lineHeight: 18, color: T.inkSoft }}>{check.detail}</PretendardFont>
      {check.action ? (
        <View style={{ marginTop: 8, marginLeft: 16, borderRadius: 12, padding: 12, backgroundColor: style.soft }}>
          <PretendardFont weight="semibold" style={{ fontSize: 12, color: style.color }}>해볼 일</PretendardFont>
          <PretendardFont style={{ marginTop: 3, fontSize: 13, lineHeight: 19, color: T.ink }}>{check.action}</PretendardFont>
        </View>
      ) : null}
    </View>
  );
}
