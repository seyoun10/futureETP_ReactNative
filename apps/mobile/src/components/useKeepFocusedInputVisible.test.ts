import { act, renderHook } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, TextInput } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { overlapToScroll, useKeepFocusedInputVisible } from './useKeepFocusedInputVisible';

const frame = (y: number, h: number) => ({
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, y, 100, h),
});
const showKeyboard = (screenY: number, height: number) =>
  act(() =>
    DeviceEventEmitter.emit('keyboardDidShow', {
      endCoordinates: { screenX: 0, screenY, width: 390, height },
    }),
  );

describe('overlapToScroll', () => {
  it('입력칸 아래 + 여백이 보이는 영역 아래를 넘은 만큼 내린다', () => {
    expect(overlapToScroll({ top: 400, bottom: 440 }, 450, 48)).toBe(38);
  });
  it('가리지 않으면 0이다', () => {
    expect(overlapToScroll({ top: 100, bottom: 140 }, 450, 48)).toBe(0);
  });
});

describe('useKeepFocusedInputVisible', () => {
  const scrollTo = jest.fn();
  const setup = async (scrollFrame: { y: number; h: number }) => {
    const hook = await renderHook(() => useKeepFocusedInputVisible());
    // ScrollView 대신 위치를 재고 스크롤만 받는 가짜를 붙인다
    hook.result.current.scrollProps.ref.current = {
      ...frame(scrollFrame.y, scrollFrame.h),
      scrollTo,
    } as unknown as ScrollViewInstance;
    return hook;
  };

  beforeEach(() => {
    scrollTo.mockReset();
    jest
      .spyOn(TextInput.State, 'currentlyFocusedInput')
      .mockReturnValue(
        frame(600, 36) as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>,
      );
  });
  afterEach(() => jest.restoreAllMocks());

  it('키패드가 입력칸을 가리면 가린 만큼 + 여백을 끌어올린다', async () => {
    // ScrollView 100~800, 키패드 위 500 → 보이는 아래 500. 입력칸 아래 636 + 48 - 500 = 184
    await setup({ y: 100, h: 700 });
    await showKeyboard(500, 344);
    expect(scrollTo).toHaveBeenCalledWith({ y: 184, animated: true });
  });

  it('지금 스크롤 위치에 더해 내린다', async () => {
    const hook = await setup({ y: 100, h: 700 });
    hook.result.current.scrollProps.onScroll({
      nativeEvent: { contentOffset: { x: 0, y: 50 } },
    } as Parameters<typeof hook.result.current.scrollProps.onScroll>[0]);
    await showKeyboard(500, 344);
    expect(scrollTo).toHaveBeenCalledWith({ y: 234, animated: true });
  });

  it('ScrollView가 키패드 위에서 끝나면(iOS [완료] 줄) 그 아래를 기준으로 한다', async () => {
    // ScrollView 100~450, 키패드 위 500 → 보이는 아래 450. 636 + 48 - 450 = 234
    await setup({ y: 100, h: 350 });
    await showKeyboard(500, 344);
    expect(scrollTo).toHaveBeenCalledWith({ y: 234, animated: true });
  });

  it('가리지 않으면 스크롤하지 않는다', async () => {
    await setup({ y: 100, h: 700 });
    await showKeyboard(750, 100);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('포커스된 입력칸이 없으면 스크롤하지 않는다', async () => {
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(undefined);
    await setup({ y: 100, h: 700 });
    await showKeyboard(500, 344);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('Android만 키패드 높이만큼 아래 여백을 두고, 키패드가 닫히면 없앤다', async () => {
    const hook = await setup({ y: 100, h: 700 });
    await showKeyboard(500, 344);
    expect(hook.result.current.bottomSpacer).toBe(Platform.OS === 'android' ? 344 : 0);
    await act(() => DeviceEventEmitter.emit('keyboardDidHide', {}));
    expect(hook.result.current.bottomSpacer).toBe(0);
  });
});
