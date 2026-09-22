import { ActivityIndicator, Image, Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PretendardFont } from "@/components/PretendardFont";
import type { CultivationType } from "@/types/farm";
import type {
  BeeDiagnosisAnalyzeResponse,
  BeeDiagnosisResult,
} from "../model";
import { DIAGNOSIS_DISPLAY_CONFIDENCE } from "../model";

export interface BeeDiagnosisContextForm {
  cultivationType: CultivationType;
  cropName: string;
  cultivationAddress: string;
  details: string;
}

interface UploadStepProps {
  selectedImage: string | null;
  loading: boolean;
  onSelectImage: () => void;
  onAnalyze: () => void;
}

export function DiagnosisUploadStep({
  selectedImage,
  loading,
  onSelectImage,
  onAnalyze,
}: UploadStepProps) {
  return (
    <View className="px-4">
      <View className="mb-5">
        <PretendardFont weight="bold" className="text-2xl text-gray-950">
          꿀벌 사진을 올려주세요
        </PretendardFont>
        <PretendardFont className="mt-2 text-sm leading-5 text-gray-500">
          배경과 벌이 잘 구분되고 몸과 날개가 선명할수록 정확하게 확인할 수 있어요.
        </PretendardFont>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="진단할 꿀벌 사진 선택"
        onPress={onSelectImage}
        className="h-64 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white active:opacity-80"
      >
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <Feather name="camera" size={28} color="#B7791F" />
            </View>
            <PretendardFont weight="semibold" className="mt-4 text-base text-gray-900">
              앨범에서 사진 선택
            </PretendardFont>
            <PretendardFont className="mt-1 text-center text-sm text-gray-500">
              JPG와 PNG 이미지를 사용할 수 있어요
            </PretendardFont>
          </View>
        )}
      </Pressable>

      {selectedImage ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSelectImage}
          className="mt-3 min-h-11 items-center justify-center active:opacity-60"
        >
          <PretendardFont weight="semibold" className="text-sm text-blue-600">
            다른 사진 선택
          </PretendardFont>
        </Pressable>
      ) : null}

      <View className="mt-5 rounded-xl bg-amber-50 px-4 py-4">
        <View className="mb-3 flex-row items-center">
          <Feather name="info" size={17} color="#92400E" />
          <PretendardFont weight="bold" className="ml-2 text-sm text-amber-900">
            인식이 잘 되는 사진
          </PretendardFont>
        </View>
        <PhotoTip icon="square" text="흰 종이나 무늬 없는 단색 배경을 사용해주세요." />
        <PhotoTip icon="maximize" text="벌 한 마리의 몸 전체와 날개가 보이게 가까이 촬영해주세요." />
        <PhotoTip icon="sun" text="그림자와 반사를 줄이고 초점이 맞은 사진을 선택해주세요." />
        <PretendardFont className="mt-1 text-xs leading-5 text-amber-800">
          살아 있는 벌은 직접 만지지 말고 안전한 거리에서 촬영해주세요.
        </PretendardFont>
      </View>

      <Button
        onPress={onAnalyze}
        loading={loading}
        disabled={!selectedImage}
        className="mt-6"
      >
        사진 분석하기
      </Button>
    </View>
  );
}

function PhotoTip({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  return (
    <View className="mb-3 flex-row items-center last:mb-0">
      <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white">
        <Feather name={icon} size={15} color="#92400E" />
      </View>
      <PretendardFont className="flex-1 text-sm leading-5 text-amber-950">
        {text}
      </PretendardFont>
    </View>
  );
}

interface ContextStepProps {
  selectedImage: string;
  analysis: BeeDiagnosisAnalyzeResponse;
  form: BeeDiagnosisContextForm;
  loading: boolean;
  onChange: (next: BeeDiagnosisContextForm) => void;
  onSubmit: () => void;
}

export function DiagnosisContextStep({
  selectedImage,
  analysis,
  form,
  loading,
  onChange,
  onSubmit,
}: ContextStepProps) {
  return (
    <View className="px-4">
      <Card className="mb-4">
        <View className="flex-row items-center">
          <Image
            source={{ uri: selectedImage }}
            className="mr-4 h-20 w-20 rounded-xl"
            resizeMode="cover"
          />
          <View className="flex-1">
            <PretendardFont className="text-xs text-gray-500">사진 분석 결과</PretendardFont>
            <PretendardFont weight="bold" className="mt-1 text-base leading-6 text-gray-950">
              {analysis.name}
            </PretendardFont>
            <PretendardFont weight="semibold" className="mt-1 text-sm text-amber-700">
              신뢰도 {DIAGNOSIS_DISPLAY_CONFIDENCE}%
            </PretendardFont>
          </View>
        </View>
      </Card>

      <View className="border-t border-gray-200 pt-5">
        <PretendardFont weight="bold" className="text-xl text-gray-950">
          농지 정보를 알려주세요
        </PretendardFont>
        <PretendardFont className="mt-2 text-sm leading-5 text-gray-500">
          재배 환경을 함께 보면 현장에 맞는 대처 방법을 안내할 수 있어요.
        </PretendardFont>

        <FieldLabel label="재배 환경" required />
        <View className="flex-row gap-2">
          {CULTIVATION_TYPES.map((item) => {
            const selected = form.cultivationType === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange({ ...form, cultivationType: item.value })}
                className={`min-h-12 flex-1 items-center justify-center rounded-xl border ${
                  selected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <PretendardFont
                  weight="semibold"
                  className={selected ? "text-blue-700" : "text-gray-600"}
                >
                  {item.label}
                </PretendardFont>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel label="재배 작물" required />
        <TextInput
          value={form.cropName}
          onChangeText={(cropName) => onChange({ ...form, cropName })}
          placeholder="예: 딸기, 블루베리"
          placeholderTextColor="#9CA3AF"
          className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900"
          style={{ fontFamily: "Pretendard-Regular" }}
        />

        <FieldLabel label="농지 위치" />
        <TextInput
          value={form.cultivationAddress}
          onChangeText={(cultivationAddress) =>
            onChange({ ...form, cultivationAddress })
          }
          placeholder="예: 충청남도 논산시 연무읍"
          placeholderTextColor="#9CA3AF"
          className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900"
          style={{ fontFamily: "Pretendard-Regular" }}
        />

        <FieldLabel label="주변 환경이나 특이사항" />
        <TextInput
          value={form.details}
          onChangeText={(details) => onChange({ ...form, details })}
          placeholder="예: 최근 고온이 이어졌고 벌의 움직임이 줄었어요"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          className="min-h-24 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-900"
          style={{ fontFamily: "Pretendard-Regular" }}
        />

        <View className="mt-5 rounded-xl bg-blue-50 px-4 py-3">
          <PretendardFont className="text-xs leading-5 text-blue-900">
            AI 진단은 참고용이에요. 방제나 폐기처럼 중요한 결정은 전문가 확인을 함께 받아주세요.
          </PretendardFont>
        </View>

        <Button
          onPress={onSubmit}
          loading={loading}
          disabled={!form.cropName.trim()}
          className="mt-6"
        >
          맞춤 대처 방법 받기
        </Button>
      </View>
    </View>
  );
}

const CULTIVATION_TYPES: {
  value: CultivationType;
  label: string;
}[] = [
  { value: "CONTROLLED", label: "시설재배" },
  { value: "OPEN_FIELD", label: "노지" },
];

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <View className="mb-2 mt-5 flex-row items-center">
      <PretendardFont weight="semibold" className="text-sm text-gray-900">
        {label}
      </PretendardFont>
      {required ? (
        <PretendardFont weight="bold" className="ml-1 text-sm text-red-500">
          *
        </PretendardFont>
      ) : null}
    </View>
  );
}

interface ResultStepProps {
  selectedImage: string;
  result: BeeDiagnosisResult;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onOpenHistory: () => void;
  onRestart: () => void;
}

export function DiagnosisResultStep({
  selectedImage,
  result,
  saving,
  saved,
  onSave,
  onOpenHistory,
  onRestart,
}: ResultStepProps) {
  return (
    <View className="px-4">
      <Image
        source={{ uri: selectedImage }}
        className="h-56 w-full rounded-2xl"
        resizeMode="cover"
      />

      <View className="mt-5 border-b border-gray-200 pb-5">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <PretendardFont className="text-xs text-gray-500">진단 결과</PretendardFont>
            <PretendardFont weight="bold" className="mt-1 text-2xl leading-8 text-gray-950">
              {result.diseaseType}
            </PretendardFont>
            <SeverityBadge severity={result.severity} />
          </View>
          <View className="items-end">
            <PretendardFont weight="bold" className="text-2xl text-gray-950">
              {DIAGNOSIS_DISPLAY_CONFIDENCE}%
            </PretendardFont>
            <PretendardFont className="mt-1 text-xs text-gray-500">신뢰도</PretendardFont>
          </View>
        </View>
        <PretendardFont className="mt-4 text-sm leading-6 text-gray-700">
          {result.description}
        </PretendardFont>
      </View>

      <ResultSection title="주요 증상" icon="search">
        {result.symptoms.map((symptom, index) => (
          <BulletLine key={`${symptom}-${index}`} text={symptom} />
        ))}
      </ResultSection>

      <ResultSection title="원인" icon="alert-circle">
        <PretendardFont className="text-sm leading-6 text-gray-700">
          {result.cause}
        </PretendardFont>
      </ResultSection>

      <ResultSection title="현재 상황 분석" icon="bar-chart-2">
        {result.situationAnalysis.map((item, index) => (
          <BulletLine key={`${item}-${index}`} text={item} />
        ))}
      </ResultSection>

      <ResultSection title="이렇게 대처해주세요" icon="check-circle">
        {result.solutions.map((solution, index) => (
          <View
            key={`${solution}-${index}`}
            className="mb-3 flex-row items-start last:mb-0"
          >
            <View className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-green-100">
              <PretendardFont weight="bold" className="text-xs text-green-700">
                {index + 1}
              </PretendardFont>
            </View>
            <PretendardFont className="flex-1 text-sm leading-6 text-gray-700">
              {solution}
            </PretendardFont>
          </View>
        ))}
      </ResultSection>

      <View className="mt-6 gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={saved ? onOpenHistory : onSave}
          className="min-h-12 flex-row items-center justify-center rounded-full bg-blue-600 active:opacity-80"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name={saved ? "list" : "bookmark"} size={18} color="#FFFFFF" />
              <PretendardFont weight="semibold" className="ml-2 text-base text-white">
                {saved ? "저장된 진단 기록 보기" : "진단 결과 저장하기"}
              </PretendardFont>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          className="min-h-12 items-center justify-center active:opacity-60"
        >
          <PretendardFont weight="semibold" className="text-sm text-gray-600">
            새로운 사진 진단하기
          </PretendardFont>
        </Pressable>
      </View>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const level = severity.trim().charAt(0);
  const color =
    level === "상"
      ? "bg-red-100 text-red-700"
      : level === "중"
        ? "bg-orange-100 text-orange-700"
        : level === "하"
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-700";
  const [backgroundClass, textClass] = color.split(" ");

  return (
    <View className={`mt-3 self-start rounded-full px-3 py-1.5 ${backgroundClass}`}>
      <PretendardFont weight="semibold" className={`text-xs ${textClass}`}>
        심각도 {severity}
      </PretendardFont>
    </View>
  );
}

function ResultSection({
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

function BulletLine({ text }: { text: string }) {
  return (
    <View className="mb-2 flex-row items-start last:mb-0">
      <View className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
      <PretendardFont className="flex-1 text-sm leading-6 text-gray-700">
        {text}
      </PretendardFont>
    </View>
  );
}
