#!/bin/bash
# PostToolUse(Bash) hook: git commit 직후, 그 커밋이 형제 저장소(D-141)가 따라가야 할 파일을 바꿨으면
# 세 형제 저장소 TODO.md "원본 변경 반영"에 항목을 적으라고 Claude에게 알린다. 막지는 않는다.
# 계약·문서·공통 규칙 파일은 커밋 타입과 상관없이, RN 앱 코드(apps/mobile/src)는 feat·fix 커밋일 때만
# 알린다(동작 버그 수정은 문서를 안 바꾸고 앱 코드만 바꾸기도 해서).
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // ""')
echo "$cmd" | grep -qE '(^|[;&| ])git( -C [^ ]+)? commit' || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

# 계약·화면 동작·공통 규칙의 원본 (테스트 파일 제외)
pattern='^(packages/shared/(src|contract)/|apps/server/src/api/|docs/(product|architecture|decisions)\.md|docs/wireframes/|\.claude/rules/mobile\.md|apps/mobile/src/i18n/locales/|eslint\.config\.mjs)'
subject=$(git log -1 --format=%s HEAD)
changed=$(git show --name-only --format= HEAD 2>/dev/null | grep -vE '\.test\.tsx?$')
files=$(echo "$changed" | grep -E "$pattern")
# RN 앱 동작 변경: feat·fix 커밋의 apps/mobile/src (feat(mobile)·fix(mobile) 포함)
if echo "$subject" | grep -qE '^(feat|fix)(\([^)]*\))?!?:'; then
  files=$(printf '%s\n%s' "$files" "$(echo "$changed" | grep -E '^apps/mobile/src/')" | grep -v '^$' | sort -u)
fi
[ -z "$files" ] && exit 0

list=$(echo "$files" | sed 's/^/  - /')
msg="커밋 $(git rev-parse --short HEAD) \"$subject\"가 형제 저장소가 따라갈 수 있는 파일을 바꿨다:
$list
API·shared 스키마·에러 코드·화면 동작·공통 규칙(레이어·문구 등) 변경이면 ../futureETP_Flutter·../futureETP_iOS·../futureETP_Android의 TODO.md \"원본 변경 반영\"에 한 줄씩 적고(필요하면 각 docs/architecture.md도) 각 저장소에서 커밋한다. RN 앱 코드의 버그 수정·동작 변경도 형제 앱에 같은 문제가 있을 수 있으면 적는다. RN 내부 구현만 바뀐 것이면 넘어간다."
jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
