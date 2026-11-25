import { useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from 'react-native';
import { Keyboard, Platform, TextInput } from 'react-native';

// 입력칸 아래로 남길 여백. 칸 아래 안내 한 줄까지 보이게 한다
export const FOCUSED_INPUT_GAP = 48;

type Frame = { top: number; bottom: number };

// 가려진 만큼(입력칸 아래 + 여백이 보이는 영역 아래보다 내려간 만큼) 더 내려야 할 거리. 안 가려지면 0
export function overlapToScroll(input: Frame, visibleBottom: number, gap = FOCUSED_INPUT_GAP) {
  return Math.max(0, input.bottom + gap - visibleBottom);
}

const measureInWindow = (target: {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
}) =>
  new Promise<Frame>((resolve) =>
    target.measureInWindow((_x, y, _w, h) => resolve({ top: y, bottom: y + h })),
  );

// 키패드가 올라오면 포커스된 입력칸이 키패드(+ iOS [완료] 줄)에 가리지 않게 ScrollView를 끌어올린다.
// iOS는 KeyboardAvoidingView가 ScrollView를 줄이고, Android는 창이 줄어들지 않는 경우에 대비해 키패드 높이만큼
// 내용 아래 여백(bottomSpacer)을 둬 끌어올릴 만큼 스크롤 여유를 만든다. 보이는 영역 아래는 ScrollView 아래와
// 키패드 위 중 높은 쪽이다. [완료] 줄이 키패드가 다 올라온 뒤 나타나 ScrollView가 다시 줄면 onLayout에서 한 번 더 맞춘다
export function useKeepFocusedInputVisible() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const ensureVisible = async () => {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current;
    if (!input || !scroll || keyboardTop.current === null) return;
    const [inputFrame, scrollFrame] = await Promise.all([
      measureInWindow(input),
      measureInWindow(scroll),
    ]);
    const visibleBottom = Math.min(scrollFrame.bottom, keyboardTop.current);
    const overlap = overlapToScroll(inputFrame, visibleBottom);
    if (overlap > 0) scroll.scrollTo({ y: offsetY.current + overlap, animated: true });
  };

  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', (event) => {
        keyboardTop.current = event.endCoordinates.screenY;
        setKeyboardHeight(event.endCoordinates.height);
        void ensureVisible();
      }),
      Keyboard.addListener('keyboardDidHide', () => {
        keyboardTop.current = null;
        setKeyboardHeight(0);
      }),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  return {
    scrollProps: {
      ref: scrollRef,
      scrollEventThrottle: 16,
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        offsetY.current = event.nativeEvent.contentOffset.y;
      },
      onLayout: (_event: LayoutChangeEvent) => {
        if (keyboardTop.current !== null) void ensureVisible();
      },
    },
    bottomSpacer: Platform.OS === 'android' ? keyboardHeight : 0,
  };
}
