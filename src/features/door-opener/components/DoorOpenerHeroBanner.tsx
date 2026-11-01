/**
 * 개폐기 화면 상단 히어로 배너
 * - 개폐기 3D 이미지를 화면 상단 중앙에 고정해서 보여줍니다.
 * - 높이가 이미지보다 낮으면 위쪽부터 보여주고 아래는 잘라냅니다.
 * - 이 컴포넌트는 이미지만 그리며, 스크롤에 따른 어둡게 처리는 부모(iot-home)가
 *   같은 영역 위에 겹쳐 그리는 오버레이로 담당합니다.
 */
import { Image, View } from "react-native";

const DOOR_OPENER_IMAGE = require("../../../../assets/images/door-opener-3d.png");

export function DoorOpenerHeroBanner({
  height,
  imageSize,
}: {
  height: number;
  imageSize: number;
}) {
  return (
    <View
      style={{ height, overflow: "hidden" }}
      className="items-center justify-start"
      pointerEvents="none"
    >
      <Image
        source={DOOR_OPENER_IMAGE}
        resizeMode="contain"
        style={{ width: imageSize, height: imageSize }}
      />
    </View>
  );
}
