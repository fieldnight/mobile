import { Image, Pressable, View } from "react-native";
import { PretendardFont } from "./PretendardFont";
import { useRouter } from "expo-router";
export function HomeGridIcon() {
  const router = useRouter();
  return (
    <View className="px-4 mb-6">
      <View className="flex-row flex-wrap">
        {[
          {
            id: "community",
            label: "농부들의 수다",
            icon: require("../../assets/homeIcons/community.png"),
          },
          {
            id: "bee-diagnosis",
            label: "벌 건강검진",
            icon: require("../../assets/homeIcons/diagnosis.png"),
          },
          {
            id: "add-farm",
            label: "내 농장 기록",
            icon: require("../../assets/homeIcons/house.png"),
          },
          {
            id: "inquiry",
            label: "문의하기",
            icon: require("../../assets/homeIcons/inquiry.png"),
          },
          {
            id: "pesticide",
            label: "맞춤 농약",
            icon: require("../../assets/homeIcons/pesticide.png"),
          },
          {
            id: "bee-news",
            label: "키워드뉴스",
            icon: require("../../assets/homeIcons/news2.png"),
          },
          {
            id: "recommend",
            label: "수정벌추천",
            icon: require("../../assets/homeIcons/recommend.png"),
          },
          {
            id: "fruit-price",
            label: "오늘의 시세",
            icon: require("../../assets/homeIcons/trading.png"),
          },
        ].map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/${item.id}` as any)}
            className="w-[25%] items-center py-4 active:opacity-70"
          >
            <Image
              source={item.icon}
              className="w-12 h-12 mb-2"
              resizeMode="contain"
            />
            <PretendardFont
              weight="semibold"
              style={{ fontSize: 13, color: "#1F2937" }}
            >
              {item.label}
            </PretendardFont>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
