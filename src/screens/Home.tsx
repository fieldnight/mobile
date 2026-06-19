import { View } from "react-native";
import { useCallback, useState } from "react";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { NewsCarousel } from "@/components/NewsCarousel";
import { PromoBanner } from "@/components/Promobanner";
import { HomeGridIcon } from "@/components/HomeGridIcon";
import { HiveStatusBanner } from "@/components/HiveStatusBanner";
import InquiryModal from "@/screens/bee-chat-inquiry";

export default function Home() {
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const handleRefresh = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: "#F4F5F7" }}>
      <PullToRefresh
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      >
        <PromoBanner />
        <HomeGridIcon onInquiryPress={() => setInquiryVisible(true)} />
        <HiveStatusBanner />
        <NewsCarousel keyword="수정벌" />
      </PullToRefresh>

      <InquiryModal
        visible={inquiryVisible}
        onClose={() => setInquiryVisible(false)}
      />
    </View>
  );
}
