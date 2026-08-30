/**
 * 개폐기 화면 배경
 * - 스마트벌통 화면들과 동일한 df.jpg 배경 이미지를 사용합니다.
 */
import { Image, StyleSheet } from "react-native";

const BG_IMAGE = require("../../../../assets/df.jpg");

export function DoorOpenerBackground() {
  return (
    <Image source={BG_IMAGE} resizeMode="cover" style={StyleSheet.absoluteFill} />
  );
}
