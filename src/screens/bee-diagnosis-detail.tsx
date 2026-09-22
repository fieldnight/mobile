import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import { Loading } from "@/components/Loading";
import { PretendardFont } from "@/components/PretendardFont";
import {
  DIAGNOSIS_DISPLAY_CONFIDENCE,
  getDiagnosisErrorMessage,
  splitDiagnosisLines,
  useDiagnosisDetail,
} from "@/features/diagnosis";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";

export default function BeeDiagnosisDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const { data, error, isLoading, refetch, isRefetching } = useDiagnosisDetail(id);

  if (isLoading) {
    return <Loading text="진단 결과를 불러오는 중..." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <AppHeader
        title="진단 상세"
        onBack={() => router.back()}
        isScrolled={isScrolled}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {error || !data ? (
          <View className="items-center px-6 py-20">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Feather name="alert-circle" size={28} color="#6B7280" />
            </View>
            <PretendardFont weight="bold" className="mt-5 text-xl text-gray-950">
              진단 결과를 찾지 못했어요
            </PretendardFont>
            <PretendardFont className="mt-2 text-center text-sm leading-5 text-gray-500">
              {getDiagnosisErrorMessage(error, "삭제되었거나 존재하지 않는 기록이에요.")}
            </PretendardFont>
            <Pressable
              accessibilityRole="button"
              disabled={isRefetching}
              onPress={() => refetch()}
              className="mt-6 min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 active:opacity-80"
            >
              <PretendardFont weight="semibold" className="text-sm text-white">
                {isRefetching ? "불러오는 중..." : "다시 불러오기"}
              </PretendardFont>
            </Pressable>
          </View>
        ) : (
          <>
            {data.imageUrl ? (
              <Image
                source={{ uri: data.imageUrl }}
                className="mx-4 h-64 rounded-2xl bg-gray-100"
                resizeMode="cover"
              />
            ) : null}

            <View className="px-4">
              <View className="border-b border-gray-200 py-5">
                <PretendardFont className="text-xs text-gray-500">
                  {formatDiagnosisDate(data.createdAt)}
                </PretendardFont>
                <View className="mt-2 flex-row items-start justify-between gap-4">
                  <PretendardFont weight="bold" className="flex-1 text-2xl leading-8 text-gray-950">
                    {data.diseaseType}
                  </PretendardFont>
                  <View className="rounded-full bg-amber-50 px-3 py-1.5">
                    <PretendardFont weight="bold" className="text-sm text-amber-800">
                      {DIAGNOSIS_DISPLAY_CONFIDENCE}%
                    </PretendardFont>
                  </View>
                </View>
              </View>

              <DetailSection title="재배 정보" icon="map-pin">
                <InfoRow label="작물" value={data.cropName} />
                <InfoRow
                  label="재배 환경"
                  value={data.cultivationType === "CONTROLLED" ? "시설재배" : "노지"}
                />
                {data.cultivationAddress ? (
                  <InfoRow label="농지 위치" value={data.cultivationAddress} />
                ) : null}
                {data.details ? <InfoRow label="특이사항" value={data.details} /> : null}
              </DetailSection>

              <DetailSection title="상황 분석" icon="bar-chart-2">
                {splitDiagnosisLines(data.situationAnalysis).map((line, index) => (
                  <DetailBullet key={`${line}-${index}`} text={line} />
                ))}
              </DetailSection>

              <DetailSection title="대처 방안" icon="check-circle">
                {splitDiagnosisLines(data.solutions).map((line, index) => (
                  <View
                    key={`${line}-${index}`}
                    className="mb-3 flex-row items-start last:mb-0"
                  >
                    <View className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <PretendardFont weight="bold" className="text-xs text-green-700">
                        {index + 1}
                      </PretendardFont>
                    </View>
                    <PretendardFont className="flex-1 text-sm leading-6 text-gray-700">
                      {line}
                    </PretendardFont>
                  </View>
                ))}
              </DetailSection>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="border-b border-gray-200 py-5">
      <View className="mb-3 flex-row items-center">
        <Feather name={icon} size={18} color="#374151" />
        <PretendardFont weight="bold" className="ml-2 text-lg text-gray-950">
          {title}
        </PretendardFont>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-start last:mb-0">
      <PretendardFont className="w-24 text-sm text-gray-500">{label}</PretendardFont>
      <PretendardFont className="flex-1 text-sm leading-5 text-gray-800">
        {value}
      </PretendardFont>
    </View>
  );
}

function DetailBullet({ text }: { text: string }) {
  return (
    <View className="mb-2 flex-row items-start last:mb-0">
      <View className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
      <PretendardFont className="flex-1 text-sm leading-6 text-gray-700">
        {text}
      </PretendardFont>
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
