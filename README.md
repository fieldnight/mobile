# Webee Mobile App

수정벌 농업 서비스 모바일 앱

## 기술 스택

- **Framework**: Expo (React Native)
- **Routing**: Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Language**: TypeScript

---

## 네이밍 규칙 (Naming Conventions)

### 1. 파일명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `Button.tsx`, `SideMenu.tsx`, `Card.tsx` |
| 화면 (Screen) | kebab-case | `home.tsx`, `add-farm.tsx`, `diagnose-history.tsx` |
| 훅 (Hook) | camelCase + use 접두사 | `useAuthStore.ts`, `useWeather.ts` |
| 유틸/헬퍼 | camelCase | `api.ts`, `formatDate.ts` |
| 타입 정의 | camelCase | `types.ts`, `index.ts` |
| 상수 | camelCase | `constants.ts`, `theme.ts` |

### 2. 변수 / 함수명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 일반 변수 | camelCase | `userName`, `currentIndex` |
| 상수 | UPPER_SNAKE_CASE | `API_URL`, `MAX_RETRY_COUNT` |
| 함수 | camelCase | `fetchUserData`, `formatDate` |
| 이벤트 핸들러 | handle + 동작 | `handlePress`, `handleSubmit`, `handleMenuPress` |
| Boolean 변수 | is/has/can/should 접두사 | `isLoading`, `hasError`, `canSubmit` |

### 3. 컴포넌트 / 타입명

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `Header`, `SideMenu`, `AddFarm` |
| 인터페이스 | PascalCase + Props/Request/Response 접미사 | `MenuItemProps`, `UserCropCreateRequest` |
| 타입 | PascalCase | `User`, `CultivationType` |
| Enum | PascalCase | `UserRole`, `AuthStatus` |

### 4. CSS 클래스 (Tailwind)

- Tailwind 유틸리티 클래스 사용
- 커스텀 클래스는 kebab-case

---

## 폴더 구조

```
src/
├── components/       # 재사용 컴포넌트 (PascalCase.tsx)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── SideMenu.tsx
│
├── screens/          # 화면 컴포넌트 (kebab-case.tsx)
│   ├── home.tsx
│   ├── profile.tsx
│   ├── add-farm.tsx
│   └── diagnose-history.tsx
│
├── navigation/       # 네비게이션 컴포넌트 (PascalCase.tsx)
│   ├── Header.tsx
│   └── Footer.tsx
│
├── stores/           # Zustand 스토어 (useSomething.ts)
│   └── useAuthStore.ts
│
├── lib/              # 유틸리티 / 설정
│   └── api.ts
│
├── types/            # 타입 정의
│   └── index.ts
│
├── features/         # 기능별 모듈 (Feature-based)
│   └── weather/
│       ├── api/
│       ├── model/
│       └── index.ts
│
└── shared/           # 공유 유틸리티
    └── auth/

app/                  # Expo Router 라우트 (kebab-case.tsx)
├── _layout.tsx
├── index.tsx
├── home.tsx
├── login.tsx
└── add-farm.tsx
```

---

## 스크립트

```bash
# 개발 서버 시작
pnpm start

# Android 실행
pnpm android

# iOS 실행
pnpm ios

# Web 실행
pnpm web
```

---

- Base URL: `https://weebelab.com`
