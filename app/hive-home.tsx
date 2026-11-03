import { Redirect } from "expo-router";

// 벌통 메인은 스마트벌통 탭(hive-control)으로 합쳤습니다. 예전 주소로 들어오면 그쪽으로 보냅니다.
export default function HiveHomeRedirect() {
  return <Redirect href="/hive-control" />;
}
