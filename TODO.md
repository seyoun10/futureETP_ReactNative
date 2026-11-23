# TODO

목표: React Native로 Android/iOS 개인용 앱 개발(스토어 미배포, D-011)
지침: 남은 항목만 둔다. 최상위 항목이 하위 항목까지 모두 끝나면 블록째 `docs/history.md`의 같은 절 끝으로 옮긴다. 새 단계·항목은 여기에 추가한다

## 5. 개발

### 5-5. 앱 공통 기반 (5-4와 병행 가능)
- [ ] 접근 키 B-b: QR(`futureetp-key:v1:`)·붙여넣기, `GET /v1/settings`로 확인 후 SecureStore, `UNAUTHORIZED` 시 B-b 이동, `scripts/` 키 생성·QR (D-044)
  - [x] SecureStore 저장·붙여넣기 입력·첫 실행 B-b(키 없으면 스택 대신)·B 목록 `설정됨` (2026-10-27, D-077)
    - [x] 키 확인 응답을 설정 스키마로 (2026-10-27, D-081)
    - [x] 앱(dev 변형 아닌 저장 키)에서 dev 서버로 키 확인: 기기 확인 때 (2026-10-31, iPhone 14 Pro, `DEV_API_TOKEN` 없이 Metro 실행: 저장 키로 접속 → 서버 키 교체 뒤 당겨서 새로고침에 B-b 자동 이동·거절 줄 → QR로 새 키 저장 뒤 목록 복귀. 거절 줄은 가운데 정렬·빨간색(`colors.error`)으로 바꿈. dev 키가 48자라 앱 형식(43자, D-044)으로 넣을 수 없어 `npm run access-key` 키로 교체)
  - [x] QR 읽기(`expo-camera`, 권한 거부·카메라 없음 안내) (2026-10-27, D-078)
    - [ ] 재빌드 후 Android 기기에서 권한 요청·QR 읽기 확인
      - 에뮬레이터 확인(2026-11-17, Pixel_API_36, prod release APK `dc6ec27`): 권한 요청 대화상자, 거부하면 "카메라를 쓸 수 없음" 안내 줄, 다시 눌러 허용하면 카메라 열림(CameraX 세션 시작). QR 읽기는 에뮬레이터 카메라로 못 봐서 실기기 남음
    - [x] iOS 재빌드 뒤 실기기에서 권한 문구(기기 언어 ko·en, `locales`)·QR 읽기 확인 (2026-11-23)
      - QR 읽기 확인(2026-10-31, iPhone 14 Pro). 권한 문구는 이미 허용된 기기라 못 봄: 앱 삭제 후 재설치 때 확인
      - ko 확인(2026-11-23, iPhone 14 Pro prod 앱 삭제 후 `646af4f` 재설치): 키체인에 접근 키가 남아 첫 화면은 A 목록. 설정 → 접근 키 → [QR 읽기]에서 처음 권한 대화상자, 본문 "서버 접근 키 QR 코드를 읽을 때 카메라를 씁니다."(ko `locales`) 그대로. 허용 → 카메라 열림 → QR 읽고 저장 뒤 설정 화면 복귀. 남은 것: en 문구(시뮬레이터 언어 English + `xcrun simctl privacy booted reset camera <번들 ID>`로 가능)
      - en 확인(2026-11-23, iPhone 18 Pro 시뮬레이터 언어 en-US, RN dev 빌드(11/4 DerivedData) + Metro): 딥링크 `futureetp-dev:///settings/access-key` → [Scan QR]에서 본문 "The camera is used to scan the server access key QR code." 그대로
  - [x] `UNAUTHORIZED` 시 어느 화면에서든 B-b로 이동 + 오류 줄 (2026-10-27, D-079)
  - [x] `scripts/` 키 생성·QR 표시(`npm run access-key`, 기존 키는 `--show`에 stdin) (2026-10-27, D-080)

### 5-6. 화면 수직 슬라이스 (API + 화면 + 테스트)
- [x] C-c 월물차트: `GET /v1/commodities/:code/contracts` + 화면(C-a 차트 공용 부품 재사용)
  - [x] `GET /v1/commodities/:code/contracts` + shared 스키마(공유 날짜 + 월물별 가격 열 배열, 오늘 잠정 값) (2026-10-28, D-092)
  - [x] C-c 화면(선 5개·끝값 y축 라벨·기간 칩 C-a와 따로 기억·제스처) (2026-10-28, `src/charts/LinesChart` + 공용 `useChartViewport`, D-093)
    - [x] 에뮬레이터에서 선 색 구분·끝값 라벨 밀어 쌓기·이동·기간 칩·십자선 상세 확인 (2026-10-28, 숫자 글꼴 서브픽셀 위치로 `J AN27` 간격 수정)
    - [x] 끝값 라벨을 보이는 범위 마지막 날 값으로(이동해도 범례 유지), 기간 맞춤이 처음 진입 때 빠지던 경쟁 상태 수정 (2026-10-28, D-093)
    - [ ] 실기기에서 같은 항목·핀치 확대 확인
      - 미러링 확인(2026-11-03, prod CL): 선 5개 색·끝값 라벨 쌓기·끌어 이동 뒤 끝값이 보이는 범위 마지막 값·길게 눌러 십자선 상세·C-a와 따로 기간 기억·목록 재진입 때 6M(D-107) 정상. 핀치는 기기 손으로
      - 미러링 재확인(2026-11-23, dev 빌드 CL): 같은 항목 정상(C-a 12M·C-c 6M 따로 기억, 십자선 상세에 롤 수익률). 남은 것은 핀치 확대(기기에서 직접)
      - [ ] 핀치 중 십자선이 켜지는 버그(2026-11-23, iPhone 14 Pro prod `646af4f`, C-c CL): 두 손가락으로 어느 정도 확대·축소한 뒤 손가락을 댄 채 있으면 십자선이 뜬다. victory 십자선 Pan(`activateAfterLongPress` 300ms, 손가락 수 제한 없음, `chartPressConfig`에 `maxPointers` 없음)이 `Gesture.Race`인데도 핀치에 취소되지 않는 것으로 보임. C-a도 같은 `useChartViewport`라 해당. 수정안: 핀치 `onStart`에서 `pinchedInTouch` 공유값을 켜고 새 터치(`hideCrosshair` Tap `onBegin`)에서 끄며, 십자선 켜기·봉 스냅 반응은 켜져 있으면 무시 + `useChartViewport.test.tsx` 회귀 테스트 → OTA → 기기 재확인, 형제 저장소 TODO 기록
        - 수정(2026-11-23): 핀치를 시작한 터치에서 십자선·봉 스냅 무시(`pinchedInTouch`, D-087 보충) + 회귀 테스트. 남은 것: OTA 뒤 기기에서 핀치 후 멈춰도 십자선이 안 뜨는지, 손을 떼고 길게 누르면 뜨는지

### 5-8. 알림
- [ ] 기기별 설정(D-120): 설정·알림 판정·기록을 installation ID(`X-Device-Id`) 기준 기기별로
  - [x] 결정·문서(decisions·product·data-model·architecture·screens) (2026-11-04)
  - [x] 앱: installation ID 생성·SecureStore(`api/deviceId.ts`, Math.random UUID v4), 인증 요청에 `X-Device-Id` (2026-11-04)
  - [x] 서버: `app_settings` → `device` 설정 컬럼 마이그레이션(`0006_device_settings`, 기존 기기 행 삭제), 토큰 없어도 `PUT /v1/devices`(shared `pushToken` nullable, 앱은 빈 토큰이면 null로 등록), `/v1/settings`·`/v1/commodities`·`/v1/devices`가 헤더 기기 사용(`api/deviceId.ts`, 처음 보인 기기는 기본값 행), 같은 토큰은 다른 기기 행에서 비움, 무효 토큰은 비우기. dev DB 적용·저장소 동작 확인 (2026-11-04)
  - [x] 알림: `alert_record.device_id`(중복 방지 키, 기기 삭제 시 함께 삭제, `0007_alert_record_device`에서 기존 기록 삭제), 알림 원자재가 같은 기기마다 판정·기록·그 기기로만 발송, 재시도·지연 발송은 기록의 기기 설정(거부 시간)·언어, 운영·ETP 후보·다수 판정 알림은 기기별 언어 문구. dev DB 적용·저장소 동작 확인 (2026-11-04)
  - [x] 서버 배포(`5f5eef7`, `0006`·`0007` 적용으로 prod 기기·설정·알림 기록 초기화) + 앱 OTA(iOS·Android). iPhone 14 Pro·16 Pro Max에 prod Release(Personal Team) 새로 설치 → prod `device`에 두 행, 기준·알림 원자재가 기기마다 따로 저장됨 확인 (2026-11-04)
  - [ ] 기기별 알림 수신 확인(푸시 토큰 등록 기기 필요: Android 실기기 또는 Apple 가입 뒤 iOS)
    - 2026-11-17 에뮬레이터(Google Play 이미지)에 prod release 설치 → 알림 허용 뒤 prod `device`에 ANDROID 행·FCM 토큰 등록 확인. 새 기기 행 locale이 앱 언어(en)와 달리 `ko`로 남던 것은 D-137로 수정(`5212503`, Android OTA `01a1e511`로 반영·확인). 알림 수신은 알림 원자재 지정 후 rare 레벨 도달 때

### 5-10. 운영과 첫 배포
- [x] 테스트 앱 배포(Firebase App Distribution): 기존 Firebase 프로젝트(FCM, D-037)의 prod Android 앱에 release APK 업로드, 테스터 그룹 `owner`(본인)에 배포. `npm run build:android:release -w apps/mobile` → `npm run distribute:android -- [노트]`(루트, 노트 기본은 `apps/mobile`·`packages/shared`를 마지막으로 바꾼 커밋, 그 커밋보다 오래된 APK는 거부). 첫 배포 1.0.0 (1) (2026-11-02, D-039 보충)
  - 재배포 2026-11-03: `31c47b4`(C 차트 십자선·등락 색 수정분), 같은 1.0.0 (1)·서명 지문 일치. 빌드 중 작업 트리가 바뀌면 미커밋 코드가 번들에 들어가므로 깨끗한 상태에서 빌드한다
  - 2026-11-03: versionCode를 커밋 수(`git rev-list --count HEAD`)로 자동 지정, 배포 스크립트를 루트 `scripts/distribute-android.sh`로 옮김(fingerprint 변화 없음 확인). `apps/mobile` `distribute:android`는 지우면 fingerprint가 바뀌어 남겨 둠: 다음 네이티브 변경 때 함께 삭제
  - [ ] 기기에서 초대 수락 → App Tester로 설치 → 접근 키 QR 등록·표시 설정 저장/복원·OTA 첫 확인(위 release APK 항목)
- [ ] Apple Developer 가입(최대한 늦게) 뒤: iOS 실기기 설치 방식 결정, APNs 발송 경로 추가 (D-037, D-039)
  - 2026-11-02: iOS 테스트 배포(Firebase App Distribution·TestFlight)는 ad-hoc 서명·UDID 등록이 유료 계정 전용이라 가입 전에는 불가. prod 변형 Personal Team 직접 설치도 보류하고 Android 기기 확인을 먼저 한다
  - [x] 2026-11-03: prod 변형 Release를 Personal Team으로 iPhone 14 Pro·16 Pro Max에 설치·실행(푸시 권한 빼고, 7일 만료). 다른 세션과 겹치지 않게 별도 git worktree에서 prebuild·빌드. 16 Pro Max는 `-allowProvisioningDeviceRegistration`으로 팀에 등록 (D-039 보충)
    - [x] 두 기기에서 접근 키 QR 등록 (2026-11-03)
    - [x] 두 기기에서 운영 데이터 표시·카메라 권한 문구 확인 (2026-11-23, 권한 문구는 14 Pro 삭제 후 재설치로 확인(위 5-5 QR 항목). 16 Pro Max는 같은 빌드 산출물이라 문구 확인을 14 Pro로 갈음)
      - 2026-11-23: 14 Pro의 prod 앱이 Personal Team 7일 만료로 열리지 않아 `b2191c0`으로 다시 설치(별도 worktree, D-039 보충 순서). 접근 키 유지, A 목록 운영 값(11/23 15:00 기준·장중·등락 색·CL 🔔)·C-a CL(한국형 기준값·rare 밴드) 정상. 남은 것: 카메라 권한 문구(앱 삭제 후 재설치 때)
      - 2026-11-23: 재설치를 `npm run ios:prod-install -- <기기>...`(`scripts/ios-prod-install.sh`)로 묶음. 16 Pro Max에 설치(새 프로필이라 기기에서 개발자 앱 재신뢰 필요). 접근 키 유지, A 목록 운영 값·C-a CL(한국형 기준값·rare 밴드) 정상(사용자 기기 확인)

- [ ] KRX 2027년 휴장일 공식 공지(보통 12월 말) 뒤 `scripts/calendar/krx/2027.json`을 맞추고(잠정 표시 지우기, 수능일 개장 지연 추가) dev·prod 다시 import
  - 2027 KRX가 `missing`인 동안 앱은 달력을 5분만 캐시하므로, import 뒤 화면 재진입·앱 복귀로 반영된다(재시작 불필요). 반영 확인만 한다

### 5-11. 검증 강화 (D-127)
- [ ] (후속) victory-native가 Gesture Handler hook API를 받으면 `useChartViewport` 제스처 이전, 예외 주석 삭제 (D-128)
  - 2026-11-16: victory-native 43.0.1은 RNGH `>=2 <4`를 허용한다. Skia 패키지 `react-native-skia` 전환(네이티브 재빌드)과 `customGestures`가 hook 제스처를 받는지 확인이 남음
  - 2026-11-16 확인: 43.0.1도 `CartesianChart`가 `customGestures`를 legacy `Gesture.Race`로 합쳐 hook 제스처를 받지 않는다. 이전 불가라 보류(43만 올리는 건 이득 없이 재빌드 비용뿐). 다음 victory-native 릴리스에서 다시 본다
  - 자동 확인: `npm run deps:watch`가 아래 (2)를 하고, CI가 매주 돌린다(D-130)
  - 확인 방법: (1) `npm view victory-native version peerDependencies`로 버전과 RNGH 허용 범위 확인 (2) `npm pack victory-native@<버전>` 압축을 풀어 `src/cartesian/CartesianChart.tsx`에서 `customGestures`를 아직 `Gesture.Race`로 합치는지 확인. 그대로면 이전 불가
