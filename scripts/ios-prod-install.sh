#!/usr/bin/env bash
# prod 변형 Release를 Personal Team으로 iPhone에 다시 설치한다(D-039 보충, 7일 만료 대응). 저장소 루트에서:
#   npm run ios:prod-install -- <기기 이름|UDID>... [--keep]
# 기기 이름은 `xcrun devicectl list devices`의 Name(예: 14P 16PM). 연결·잠금 해제된 기기만 설치된다.
# 메인 트리의 dev 변형 ios/를 건드리지 않도록 HEAD를 임시 git worktree로 꺼내 prebuild·빌드한다.
# 커밋하지 않은 변경은 들어가지 않는다. --keep이면 끝난 뒤 worktree를 지우지 않는다(다음 설치에 재사용하지는 않음).
# 첫 기기를 빌드 대상으로 써서 -allowProvisioningDeviceRegistration으로 팀에 등록하므로, 처음 쓰는 기기는 맨 앞에 둔다.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
ROOT=$PWD

TEAM_ID=E8B6A6F4B9
BUNDLE_ID=io.github.seyoon.futureetp
SCHEME=futureETP

fail() {
  echo "ios-prod-install: $*" >&2
  exit 1
}
log() { echo "ios-prod-install: $*"; }

keep=0
devices=()
for arg in "$@"; do
  case $arg in
    --keep) keep=1 ;;
    -*) fail "알 수 없는 옵션: $arg" ;;
    *) devices+=("$arg") ;;
  esac
done
((${#devices[@]} > 0)) || fail "기기를 하나 이상 주세요 (예: npm run ios:prod-install -- 14P 16PM)"

# 기기 이름을 UDID로 바꾼다. 연결 안 된 기기는 빌드 전에 거른다.
device_list=$(xcrun devicectl list devices 2>/dev/null)
udids=()
for d in "${devices[@]}"; do
  line=$(awk -v d="$d" '$0 ~ /physical/ && ($1 == d || index($0, d" ")) {print; exit}' <<<"$device_list")
  [[ -n $line ]] || fail "기기를 찾지 못했습니다: $d (xcrun devicectl list devices)"
  [[ $line == *"available (paired)"* ]] || fail "기기가 연결되지 않았습니다: $d"
  udids+=("$(grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' <<<"$line")")
done

[[ -z $(git status --porcelain) ]] || log "경고: 커밋하지 않은 변경은 빌드에 들어가지 않습니다(HEAD $(git rev-parse --short HEAD) 기준)"

WT=$(mktemp -d "${TMPDIR:-/tmp}/futureetp-ios-prod.XXXXXX")
cleanup() {
  if ((keep)); then
    log "worktree를 남겼습니다: $WT (지우기: git worktree remove --force $WT)"
  else
    git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"
  fi
}
trap cleanup EXIT

log "worktree 만들기: $WT ($(git rev-parse --short HEAD))"
git worktree add --detach "$WT" HEAD >/dev/null
# 커밋하지 않는 파일. prebuild가 config를 읽을 때 필요하다(Android용이지만 없으면 config 검증이 실패할 수 있다)
cp apps/mobile/google-services.json "$WT/apps/mobile/"

cd "$WT"
log "의존성 설치"
HUSKY=0 npm ci --prefer-offline --no-audit --no-fund >/dev/null

cd apps/mobile
# UTF-8 locale이 아니면 pod install이 멈춘다. Personal Team은 Push 권한을 서명하지 못해 IOS_PERSONAL_TEAM=1로 뺀다.
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 APP_VARIANT=production IOS_PERSONAL_TEAM=1
log "prebuild(prod, iOS)"
npx expo prebuild --clean --platform ios --no-install >/dev/null
log "pod install"
(cd ios && pod install >/dev/null)

log "xcodebuild Release (빌드 대상 ${devices[0]})"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Release \
  -destination "platform=iOS,id=${udids[0]}" -derivedDataPath ios/build \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$TEAM_ID" -quiet build

APP="ios/build/Build/Products/Release-iphoneos/$SCHEME.app"
[[ -d $APP ]] || fail "빌드 산출물이 없습니다: $APP"

for i in "${!udids[@]}"; do
  log "설치: ${devices[$i]}"
  # 0xe8008012면 그 기기가 프로필에 없다. 그 기기를 맨 앞에 두고 다시 실행한다.
  xcrun devicectl device install app --device "${udids[$i]}" "$APP" >/dev/null
  xcrun devicectl device process launch --device "${udids[$i]}" --terminate-existing "$BUNDLE_ID" >/dev/null 2>&1 ||
    log "설치는 됐지만 실행이 거부됐습니다: ${devices[$i]}. 기기 잠금을 풀고, 설정 > 일반 > VPN 및 기기 관리에서 개발자 앱을 신뢰한 뒤 직접 여세요"
done
log "완료: ${devices[*]} (7일 뒤 만료, $(date -v+7d '+%m/%d %H:%M') 전에 다시 설치)"
