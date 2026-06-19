import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import { HiveAddSheet } from "@/components/HiveAddSheet";
import { C } from "@/constants/hive-colors";

export default function HiveAddScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const close = () => {
    setVisible(false);
    router.back();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader title="벌통 등록" onBack={close} />
      <HiveAddSheet visible={visible} onClose={close} />
    </View>
  );
}
