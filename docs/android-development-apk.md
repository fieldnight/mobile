# Expo Go / Android Development APK 실행 안내

대부분의 프론트 개발은 기존처럼 Expo Go로 확인하면 됩니다.
NFC/HCE 기능은 Android native 기능이라 Expo Go에서는 동작하지 않고, Android development APK에서만 테스트합니다.

## 먼저 이것만 보면 됩니다

일반 UI/API 개발자는 Expo Go를 사용합니다.

```bash
pnpm start:go
```

위 명령은 아래 명령과 같은 역할입니다.

```bash
pnpm expo start --go
# 또는
npx expo start --go
```

NFC/HCE를 테스트하는 사람만 development APK를 설치하고 아래 명령을 사용합니다.

```bash
pnpm start:dev
```

위 명령은 아래 명령과 같은 역할입니다.

```bash
pnpm expo start --dev-client
# 또는
npx expo start --dev-client
```

## PR에 APK 파일을 올리지 않습니다

`webee-development.apk` 같은 APK 파일은 빌드 산출물이고 용량이 큽니다.
따라서 PR에는 APK 파일을 올리지 않습니다.

필요한 경우 PR 설명, 노션, 디스코드 등에 EAS 빌드 링크만 공유합니다.

## Expo Go로 확인하는 방법

NFC와 관계없는 화면 작업, API 연동, 스타일 수정, 일반 컴포넌트 수정은 Expo Go로 확인합니다.

```bash
pnpm start:go
```

터미널에 QR 코드가 뜨면 Expo Go 앱으로 스캔합니다.

## Android Development APK로 확인하는 방법

NFC/HCE 기능을 테스트해야 하는 경우에만 사용합니다.
먼저 Android 폰에 development APK를 설치합니다.

기존 development APK 다운로드:
https://expo.dev/artifacts/eas/bbaSM1sQncY7kfKey9kG_neUF5IMer3mN3hqp5Duhi8.apk

설치 후에는 Expo Go가 아니라 설치된 `webee-mo` 개발 앱을 실행합니다.

개발 서버 실행:

```bash
pnpm start:dev
```

터미널에 QR 코드가 뜨면 카메라 또는 QR 스캐너로 스캔합니다.
열 앱을 선택하라는 화면이 나오면 Expo Go가 아니라 설치된 `webee-mo` 개발 앱을 선택합니다.

직접 서버 주소를 입력해야 하면 아래 형식으로 입력합니다.

```text
http://본인_PC_IP:포트번호
```

예시:

```text
http://192.168.0.21:8081
```

8081 포트가 사용 중이면 Expo가 8082 같은 다른 포트를 사용할 수 있습니다.
그 경우 터미널에 표시된 포트 번호를 그대로 사용합니다.

## APK를 직접 새로 빌드하는 방법

대부분의 개발자는 이 과정을 할 필요가 없습니다.
NFC/HCE 담당자 또는 native 설정을 변경한 사람이 필요할 때만 새로 빌드합니다.

프로젝트 폴더로 이동합니다.

```bash
cd /d/webee-web/mobile
```

Expo/EAS 로그인이 안 되어 있으면 로그인합니다.

```bash
pnpm dlx eas-cli login
```

Android development APK를 빌드합니다.

```bash
pnpm dlx eas-cli build --profile development --platform android
```

빌드가 끝나면 터미널에 APK 다운로드 링크가 표시됩니다.
해당 링크에서 APK를 다운로드해 Android 폰에 설치하면 됩니다.

최근 빌드 목록 확인:

```bash
pnpm dlx eas-cli build:list --platform android --limit 1
```

## APK를 다시 빌드해야 하는 경우

아래 변경은 native 영역에 영향을 주기 때문에 APK를 다시 빌드해야 합니다.

- `app.json` 변경
- `plugins/withWeBeeHce.js` 변경
- NFC/HCE 서비스 변경
- native 라이브러리 추가/삭제
- `package.json`에서 native 모듈 관련 의존성 변경

아래 변경은 기존 development APK를 그대로 사용해도 됩니다.

- React Native 화면 UI 수정
- TypeScript/JavaScript 로직 수정
- 스타일 수정
- 일반 컴포넌트 수정

이 경우 APK를 새로 만들 필요 없이 개발 서버만 다시 실행하면 됩니다.

```bash
pnpm start:dev
```

## 정리

- NFC/HCE 작업이 아니면 `pnpm start:go`
- NFC/HCE 작업이면 APK 설치 후 `pnpm start:dev`
- APK 파일은 PR에 올리지 않음
- APK가 필요한 사람에게만 EAS 빌드 링크 공유
