import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "@/components/AppHeader";
import { PretendardFont } from "@/components/PretendardFont";
import {
  DiagnosisContextStep,
  DiagnosisResultStep,
  DiagnosisUploadStep,
  getDiagnosisErrorMessage,
  parseDiagnosisConfidence,
  useAiDiagnosis,
  useAnalyzeBeeImage,
  useSaveDiagnosis,
  type BeeDiagnosisAnalyzeResponse,
  type BeeDiagnosisContextForm,
  type BeeDiagnosisResult,
} from "@/features/diagnosis";
import { HEADER_HEIGHT, useScrollHeader } from "@/hooks";

type DiagnosisStep = "upload" | "context" | "result";

const INITIAL_CONTEXT: BeeDiagnosisContextForm = {
  cultivationType: "OPEN_FIELD",
  cropName: "",
  cultivationAddress: "",
  details: "",
};

export default function BeeDiagnosisScreen() {
  const router = useRouter();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();
  const analyzeMutation = useAnalyzeBeeImage();
  const aiMutation = useAiDiagnosis();
  const saveMutation = useSaveDiagnosis();
  const [step, setStep] = useState<DiagnosisStep>("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BeeDiagnosisAnalyzeResponse | null>(null);
  const [context, setContext] = useState<BeeDiagnosisContextForm>(INITIAL_CONTEXT);
  const [result, setResult] = useState<BeeDiagnosisResult | null>(null);
  const [savedDiagnosisId, setSavedDiagnosisId] = useState<number | null>(null);

  const currentStep = useMemo(
    () => ({ upload: 1, context: 2, result: 3 })[step],
    [step],
  );

  const triggerHaptic = useCallback((style: "light" | "medium") => {
    if (Platform.OS === "web") return;
    const impactStyle =
      style === "light"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(impactStyle);
  }, []);

  const pickImage = useCallback(async () => {
    triggerHaptic("light");
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (picked.canceled || !picked.assets[0]) return;
    setSelectedImage(picked.assets[0].uri);
    setAnalysis(null);
    setResult(null);
    setSavedDiagnosisId(null);
  }, [triggerHaptic]);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert("사진을 선택해주세요", "진단할 꿀벌 사진이 필요해요.");
      return;
    }

    try {
      const nextAnalysis = await analyzeMutation.mutateAsync(selectedImage);
      setAnalysis(nextAnalysis);
      setStep("context");
      triggerHaptic("medium");
    } catch (error) {
      Alert.alert(
        "사진을 분석하지 못했어요",
        getDiagnosisErrorMessage(error, "잠시 후 다시 시도해주세요."),
      );
    }
  }, [analyzeMutation, selectedImage, triggerHaptic]);

  const requestAdvice = useCallback(async () => {
    if (!analysis) return;
    if (!context.cropName.trim()) {
      Alert.alert("재배 작물을 입력해주세요", "맞춤 대처 방법에 필요한 정보예요.");
      return;
    }

    try {
      const advice = await aiMutation.mutateAsync({
        disease: analysis.name,
        cultivationType: context.cultivationType,
        cropName: context.cropName.trim(),
        cultivationAddress: context.cultivationAddress.trim() || undefined,
        details: context.details.trim() || undefined,
      });

      if (!advice.solutions?.length) {
        throw new Error("대처 방안 응답이 비어 있습니다.");
      }

      setResult({
        diseaseType: analysis.name,
        confidence: parseDiagnosisConfidence(analysis.confidence),
        description: analysis.description,
        symptoms: analysis.symptoms ?? [],
        cause: analysis.cause,
        severity: analysis.severity,
        situationAnalysis: advice.situationAnalysis ?? [],
        solutions: advice.solutions,
      });
      setStep("result");
      triggerHaptic("medium");
    } catch (error) {
      Alert.alert(
        "대처 방법을 불러오지 못했어요",
        getDiagnosisErrorMessage(error, "입력 내용을 확인하고 다시 시도해주세요."),
      );
    }
  }, [aiMutation, analysis, context, triggerHaptic]);

  const saveResult = useCallback(async () => {
    if (!selectedImage || !result) return;

    try {
      const saved = await saveMutation.mutateAsync({
        imageUri: selectedImage,
        request: {
          diseaseType: result.diseaseType,
          confidence: result.confidence,
          cropName: context.cropName.trim(),
          cultivationType: context.cultivationType,
          cultivationAddress: context.cultivationAddress.trim() || undefined,
          details: context.details.trim() || undefined,
          situationAnalysis: result.situationAnalysis.join("\n"),
          solutions: result.solutions.join("\n"),
        },
      });
      setSavedDiagnosisId(saved.beeDiagnosisId);
      triggerHaptic("medium");
      Alert.alert("저장했어요", "진단 기록에서 언제든 다시 확인할 수 있어요.");
    } catch (error) {
      Alert.alert(
        "저장하지 못했어요",
        getDiagnosisErrorMessage(error, "잠시 후 다시 시도해주세요."),
      );
    }
  }, [context, result, saveMutation, selectedImage, triggerHaptic]);

  const restart = useCallback(() => {
    analyzeMutation.reset();
    aiMutation.reset();
    saveMutation.reset();
    setStep("upload");
    setSelectedImage(null);
    setAnalysis(null);
    setContext(INITIAL_CONTEXT);
    setResult(null);
    setSavedDiagnosisId(null);
  }, [aiMutation, analyzeMutation, saveMutation]);

  const goBack = useCallback(() => {
    triggerHaptic("light");
    if (step === "result") {
      setStep("context");
      return;
    }
    if (step === "context") {
      setStep("upload");
      return;
    }
    router.back();
  }, [router, step, triggerHaptic]);

  const openHistory = useCallback(() => {
    if (savedDiagnosisId) {
      router.push(`/bee-diagnosis-detail/${savedDiagnosisId}` as never);
      return;
    }
    router.push("/diagnose-history");
  }, [router, savedDiagnosisId]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <AppHeader
        title="꿀벌 질병 진단"
        onBack={goBack}
        isScrolled={isScrolled}
        rightAction={{
          icon: "clock",
          onPress: () => router.push("/diagnose-history"),
          testId: "button-diagnosis-history",
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 16,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <DiagnosisStepIndicator current={currentStep} />

        {step === "upload" ? (
          <DiagnosisUploadStep
            selectedImage={selectedImage}
            loading={analyzeMutation.isPending}
            onSelectImage={pickImage}
            onAnalyze={analyzeImage}
          />
        ) : null}

        {step === "context" && selectedImage && analysis ? (
          <DiagnosisContextStep
            selectedImage={selectedImage}
            analysis={analysis}
            form={context}
            loading={aiMutation.isPending}
            onChange={setContext}
            onSubmit={requestAdvice}
          />
        ) : null}

        {step === "result" && selectedImage && result ? (
          <DiagnosisResultStep
            selectedImage={selectedImage}
            result={result}
            saving={saveMutation.isPending}
            saved={savedDiagnosisId != null}
            onSave={saveResult}
            onOpenHistory={openHistory}
            onRestart={restart}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagnosisStepIndicator({ current }: { current: number }) {
  return (
    <View className="mb-6 flex-row items-center px-4">
      {[1, 2, 3].map((step, index) => (
        <View key={step} className="flex-1 flex-row items-center">
          <View
            className={`h-7 w-7 items-center justify-center rounded-full ${
              step <= current ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <PretendardFont
              weight="bold"
              className={`text-xs ${step <= current ? "text-white" : "text-gray-500"}`}
            >
              {step}
            </PretendardFont>
          </View>
          {index < 2 ? (
            <View
              className={`mx-2 h-0.5 flex-1 ${
                step < current ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
