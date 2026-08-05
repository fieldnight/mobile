import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import { Loading } from "@/components/Loading";
import { PretendardFont } from "@/components/PretendardFont";
import {
  DIAGNOSIS_DISPLAY_CONFIDENCE,
  getDiagnosisErrorMessage,
  splitDiagnosisLines,
  useDiagnosisList,
} from "@/features/diagnosis";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";

export default function DiagnosisHistoryScreen() {
  const router = useRouter();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const { data: diagnoses, error, isLoading, refetch, isRefetching } = useDiagnosisList();

  if (isLoading) {
    return <Loading text="진단 기록을 불러오는 중..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <AppHeader
        title="진단 기록"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: HEADER_HEIGHT + 16,
          paddingBottom: 120,
        }}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {error ? (
          <HistoryNotice
            icon="alert-circle"
            title="진단 기록을 불러오지 못했어요"
            description={getDiagnosisErrorMessage(error, "잠시 후 다시 시도해주세요.")}
            actionLabel={isRefetching ? "불러오는 중..." : "다시 불러오기"}
            onAction={() => refetch()}
          />
        ) : !diagnoses?.length ? (
          <HistoryNotice
            icon="camera"
            title="아직 저장된 진단이 없어요"
            description="꿀벌 사진으로 질병을 확인하고 결과를 저장해보세요."
            actionLabel="질병 진단 시작하기"
            onAction={() => router.push("/bee-diagnosis")}
          />
        ) : (
          <View>
            <PretendardFont className="mb-4 text-sm text-gray-500">
              최근 진단부터 보여드려요
            </PretendardFont>
            {diagnoses.map((diagnosis) => {
              const summary = splitDiagnosisLines(diagnosis.situationAnalysis)[0];
              return (
                <Pressable
                  key={diagnosis.beeDiagnosisId}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      `/bee-diagnosis-detail/${diagnosis.beeDiagnosisId}` as never,
                    )
                  }
                  className="mb-3 flex-row rounded-2xl bg-white p-4 shadow-sm active:opacity-75"
                >
                  {diagnosis.imageUrl ? (
                    <Image
                      source={{ uri: diagnosis.imageUrl }}
                      className="mr-4 h-24 w-24 rounded-xl bg-gray-100"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="mr-4 h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
                      <Feather name="image" size={26} color="#9CA3AF" />
                    </View>
                  )}

                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-start justify-between">
                      <PretendardFont
                        weight="bold"
                        className="mr-2 flex-1 text-base leading-6 text-gray-950"
                        numberOfLines={2}
                      >
                        {diagnosis.diseaseType}
                      </PretendardFont>
                      <Feather name="chevron-right" size={20} color="#9CA3AF" />
                    </View>
                    <PretendardFont weight="semibold" className="mt-1 text-xs text-amber-700">
                      신뢰도 {DIAGNOSIS_DISPLAY_CONFIDENCE}%
                    </PretendardFont>
                    {summary ? (
                      <PretendardFont
                        className="mt-2 text-xs leading-5 text-gray-500"
                        numberOfLines={2}
                      >
                        {summary}
                      </PretendardFont>
                    ) : null}
                    <PretendardFont className="mt-auto pt-2 text-xs text-gray-400">
                      {formatDiagnosisDate(diagnosis.createdAt)}
                    </PretendardFont>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryNotice({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View className="items-center py-20">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Feather name={icon} size={28} color="#6B7280" />
      </View>
      <PretendardFont weight="bold" className="mt-5 text-xl text-gray-950">
        {title}
      </PretendardFont>
      <PretendardFont className="mt-2 text-center text-sm leading-5 text-gray-500">
        {description}
      </PretendardFont>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        className="mt-6 min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 active:opacity-80"
      >
        <PretendardFont weight="semibold" className="text-sm text-white">
          {actionLabel}
        </PretendardFont>
      </Pressable>
    </View>
  );
}

function formatDiagnosisDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
