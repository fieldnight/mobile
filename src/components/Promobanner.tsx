// import { useEffect, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   Pressable,
//   FlatList,
//   Animated,
//   Dimensions,
//   ImageBackground,
//   StyleSheet,
// } from "react-native";
// import { useRouter } from "expo-router";

// const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const BANNER_WIDTH = SCREEN_WIDTH - 32;

// const SLIDE_INTERVAL = 9000;
// const COPY_INTERVAL = 3000;

// const HIVE_COPIES = [
//   { before: "벌이 더 열심히 일하게\n만들 수 있다면", hl: " 어떨까요?" },
//   { before: "올해 수확량,\n", hl: "벌통이 결정합니다" },
//   { before: "옆 농장이 나보다\n", hl: "착과율이 높은 이유" },
//   { before: "내 벌통 상태,\n", hl: "지금 바로 확인해요" },
//   { before: "벌통 환경이 바뀌면\n", hl: "착과율도 달라져요" },
// ];

// const REPORT_COPIES = [
//   { before: "고민 하나로\n", hl: "수익이 늘어난다면?" },
//   { before: "지금 고민이\n", hl: "수익으로 바뀐다면?" },
//   { before: "AI가 답 찾고\n", hl: "수익까지 계산해드려요" },
// ];

// // assets/images 폴더에 저장하세요
// const IMG_HIVE = require("../../assets/images/banner_hive.png");
// const IMG_REPORT = require("../../assets/images/banner_report.png");

// // const FONT_BOLD = "Pretendard-Bold";
// // const FONT_SEMI = "Pretendard-SemiBold";

// /* ─── 카피 도트 ─── */
// function CopyDots({
//   count,
//   current,
//   activeColor,
//   inactiveColor,
// }: {
//   count: number;
//   current: number;
//   activeColor: string;
//   inactiveColor: string;
// }) {
//   return (
//     <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
//       {Array.from({ length: count }).map((_, i) => (
//         <View
//           key={i}
//           style={{
//             width: i === current ? 12 : 4,
//             height: 4,
//             borderRadius: 2,
//             backgroundColor: i === current ? activeColor : inactiveColor,
//           }}
//         />
//       ))}
//     </View>
//   );
// }

// /* ─── 페이드 카피 ─── */
// function AnimatedTitle({
//   copy,
//   hlColor,
// }: {
//   copy: { before: string; hl: string };
//   hlColor: string;
// }) {
//   const opacity = useRef(new Animated.Value(1)).current;
//   const [displayed, setDisplayed] = useState(copy);

//   useEffect(() => {
//     Animated.timing(opacity, {
//       toValue: 0,
//       duration: 180,
//       useNativeDriver: true,
//     }).start(() => {
//       setDisplayed(copy);
//       Animated.timing(opacity, {
//         toValue: 1,
//         duration: 180,
//         useNativeDriver: true,
//       }).start();
//     });
//   }, [copy]);

//   return (
//     <Animated.View style={{ opacity, minHeight: 54 }}>
//       <Text style={[styles.titleText]}>
//         {displayed.before}
//         <Text style={{ color: hlColor }}>{displayed.hl}</Text>
//       </Text>
//     </Animated.View>
//   );
// }

// /* ─── 프로그레스 바 ─── */
// function ProgressBar({ active, color }: { active: boolean; color: string }) {
//   const widthAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     widthAnim.setValue(0);
//     if (active) {
//       Animated.timing(widthAnim, {
//         toValue: BANNER_WIDTH,
//         duration: SLIDE_INTERVAL,
//         useNativeDriver: false,
//       }).start();
//     }
//   }, [active]);

//   return (
//     <View style={styles.progressWrap}>
//       <Animated.View
//         style={[
//           styles.progressFill,
//           { width: widthAnim, backgroundColor: color },
//         ]}
//       />
//     </View>
//   );
// }

// /* ─── 메인 ─── */
// export function PromoBanner() {
//   const router = useRouter();
//   const flatListRef = useRef<FlatList>(null);
//   const [curSlide, setCurSlide] = useState(0);
//   const [curHive, setCurHive] = useState(0);
//   const [curReport, setCurReport] = useState(0);
//   const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const resetSlideTimer = () => {
//     if (slideTimerRef.current) clearInterval(slideTimerRef.current);
//     slideTimerRef.current = setInterval(() => {
//       setCurSlide((prev) => {
//         const next = (prev + 1) % 2;
//         flatListRef.current?.scrollToIndex({ index: next, animated: true });
//         return next;
//       });
//     }, SLIDE_INTERVAL);
//   };

//   useEffect(() => {
//     resetSlideTimer();
//     return () => {
//       if (slideTimerRef.current) clearInterval(slideTimerRef.current);
//     };
//   }, []);

//   useEffect(() => {
//     if (curSlide !== 0) return;
//     const t = setInterval(
//       () => setCurHive((p) => (p + 1) % HIVE_COPIES.length),
//       COPY_INTERVAL,
//     );
//     return () => clearInterval(t);
//   }, [curSlide]);

//   useEffect(() => {
//     if (curSlide !== 1) return;
//     const t = setInterval(
//       () => setCurReport((p) => (p + 1) % REPORT_COPIES.length),
//       COPY_INTERVAL,
//     );
//     return () => clearInterval(t);
//   }, [curSlide]);

//   const onScrollEnd = (e: any) => {
//     const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 16));
//     if (idx !== curSlide) {
//       setCurSlide(idx);
//       resetSlideTimer();
//     }
//   };

//   const SLIDES = [
//     {
//       id: "hive",
//       image: IMG_HIVE,
//       copies: HIVE_COPIES,
//       curCopy: curHive,
//       hlColor: "#92400E",
//       dotActive: "#F59E0B",
//       dotInactive: "rgba(146,64,14,0.2)",
//       ctaBg: "#F59E0B",
//       ctaLabel: "벌통 관리하기",
//       route: "/hive-control",
//       progressColor: "#0000003c",
//     },
//     {
//       id: "report",
//       image: IMG_REPORT,
//       copies: REPORT_COPIES,
//       curCopy: curReport,
//       hlColor: "#5f0634",
//       dotActive: "#5f0634",
//       dotInactive: "rgba(6,95,70,0.2)",
//       ctaBg: "#5f0634",
//       ctaLabel: "AI에게 물어보기",
//       route: "/ai-report",
//       progressColor: "#0000003c",
//     },
//   ];

//   return (
//     <View>
//       {/*
//        * 홍보 배너 — 스마트벌통 / AI 리포트
//        * - 배경: PNG 이미지 전체 사용 (ImageBackground)
//        * - 슬라이드 전환: 6초 자동 + 수동 스와이프 (FlatList)
//        * - 카피 전환: 3초 페이드 (Animated opacity), 활성 슬라이드만 동작
//        * - 진행 바: Animated.Value width 애니메이션
//        * - 폰트: Pretendard 고정
//        */}
//       <FlatList
//         ref={flatListRef}
//         data={SLIDES}
//         horizontal
//         pagingEnabled={false}
//         scrollEnabled
//         showsHorizontalScrollIndicator={false}
//         snapToInterval={BANNER_WIDTH + 16}
//         snapToAlignment="start"
//         decelerationRate="fast"
//         contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
//         onMomentumScrollEnd={onScrollEnd}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item, index }) => (
//           <ImageBackground
//             source={item.image}
//             style={styles.slide}
//             imageStyle={{ borderRadius: 18 }}
//             resizeMode="cover"
//           >
//             {/* 글자 + 버튼 영역 — 이미지 왼쪽 하단에 올림 */}
//             <View style={styles.overlay}>
//               <AnimatedTitle
//                 copy={item.copies[item.curCopy]}
//                 hlColor={item.hlColor}
//               />
//               <CopyDots
//                 count={item.copies.length}
//                 current={item.curCopy}
//                 activeColor={item.dotActive}
//                 inactiveColor={item.dotInactive}
//               />
//               <Pressable
//                 onPress={() => router.push(item.route as any)}
//                 style={({ pressed }) => [
//                   styles.ctaBtn,
//                   {
//                     backgroundColor: item.ctaBg,
//                     opacity: pressed ? 0.85 : 1,
//                     transform: [{ scale: pressed ? 0.97 : 1 }],
//                   },
//                 ]}
//               >
//                 <Text style={[styles.ctaBtnText]}>{item.ctaLabel}</Text>
//                 <Text style={styles.ctaArrow}>›</Text>
//               </Pressable>
//             </View>

//             <ProgressBar
//               active={curSlide === index}
//               color={item.progressColor}
//             />
//           </ImageBackground>
//         )}
//       />

//       {/* 슬라이드 인디케이터 도트 */}
//       <View style={styles.slideDots}>
//         {SLIDES.map((s, i) => (
//           <View
//             key={s.id}
//             style={[
//               styles.slideDot,
//               {
//                 width: i === curSlide ? 16 : 4,
//                 backgroundColor: i === curSlide ? s.dotActive : "#ddd",
//               },
//             ]}
//           />
//         ))}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   slide: {
//     width: BANNER_WIDTH,
//     height: 230,
//     borderRadius: 18,
//     overflow: "hidden",
//     justifyContent: "flex-end",
//   },
//   overlay: {
//     padding: 18,
//     paddingBottom: 16,
//     // 이미지에 이미 칩이 포함되어 있으므로 글자+버튼만
//   },
//   titleText: {
//     fontSize: 32,
//     letterSpacing: -4,
//     color: "#111",
//     lineHeight: 36,
//   },
//   ctaBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     alignSelf: "flex-start",
//     borderRadius: 30,
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     gap: 2,
//     marginTop: 12,
//   },
//   ctaBtnText: {
//     fontSize: 12,
//     color: "#fff",
//     letterSpacing: -0.2,
//   },
//   ctaArrow: {
//     fontSize: 15,
//     color: "#fff",
//     lineHeight: 18,
//   },
//   progressWrap: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: 2.5,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },
//   progressFill: {
//     height: "100%",
//   },
//   slideDots: {
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     gap: 5,
//     marginTop: 10,
//   },
//   slideDot: {
//     height: 4,
//     borderRadius: 2,
//   },
// });
