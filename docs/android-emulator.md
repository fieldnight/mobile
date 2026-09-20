# PC에서 Expo Go 실행

프로젝트 루트의 `start-emulator.cmd`를 더블클릭합니다.
가상 기기와 Expo 개발 서버를 켜고 앱을 엽니다. 이미 켜져 있으면 다시 사용합니다.
코드를 저장하면 실행 중인 앱에 반영됩니다. APK를 빌드하지 않습니다.

- SDK와 Android 이미지: `D:\Android\Sdk`
- 가상 기기 데이터: `D:\webee-web\mobile\tmp\android-avd`
- 설치 및 실행 임시 파일: `D:\webee-web\mobile\tmp\android-temp`
- 개발 서버 로그: `tmp\hive-ux\metro.log`, `tmp\hive-ux\metro-error.log`

처음 앱을 열 때는 로그인해야 합니다. 에뮬레이터를 종료해도 로그인과 앱 데이터는 유지됩니다.
마우스로 터치·드래그할 수 있고 그래프의 +/− 버튼으로 확대·축소할 수 있습니다.
실제 NFC 하드웨어 동작은 휴대폰에서 별도로 확인해야 합니다.

현재 PC의 기존 C드라이브 빌드 SDK는 그대로 두고, 이 실행 파일에서만 D드라이브 SDK를 사용합니다.
