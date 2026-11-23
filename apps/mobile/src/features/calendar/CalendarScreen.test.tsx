import type { Calendar } from '@futureetp/shared';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { useAccessKeyStore } from '@/api/accessToken';
import { getCalendar } from '@/api/calendar';
import { getCommodities } from '@/api/commodities';
import { queryClient } from '@/api/queryClient';
import { getSettings } from '@/api/settings';
import { useDisplaySettings } from '@/stores/displaySettings';

// 예외 일정을 기기 로컬로 옮기므로(D-144) 기대값이 시간대에 따라 달라진다. 한국 기준으로 고정한다
jest.mock('./localSchedule', () => ({
  ...jest.requireActual<typeof import('./localSchedule')>('./localSchedule'),
  deviceTimeZone: () => 'Asia/Seoul',
}));

jest.mock('@/api/calendar', () => ({ getCalendar: jest.fn() }));
jest.mock('@/api/commodities', () => ({ getCommodities: jest.fn() }));
jest.mock('@/api/settings', () => ({ getSettings: jest.fn(), patchSettings: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
const mockCalendar = jest.mocked(getCalendar);

const DATA: Calendar = {
  from: '2026-11-01',
  to: '2027-01-31',
  exceptions: [
    { market: 'CME', date: '2026-11-26', kind: 'HALT', at: '13:30', note: 'Thanksgiving Day' },
    { market: 'NYSE', date: '2026-11-26', kind: 'CLOSED', at: null, note: 'Thanksgiving Day' },
    {
      market: 'NYSE',
      date: '2026-11-27',
      kind: 'EARLY_CLOSE',
      at: '13:00',
      note: 'Day after Thanksgiving',
    },
    { market: 'KRX', date: '2026-12-31', kind: 'CLOSED', at: null, note: '연말 휴장' },
    { market: 'KRX', date: '2027-01-04', kind: 'LATE_OPEN', at: '10:00', note: '연초 개장식' },
  ],
  missing: [],
};

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 10, 21, 9, 0),
    doNotFake: ['nextTick', 'setImmediate'],
  });
  useDisplaySettings.setState({ language: 'ko', upDownStyle: 'KR' });
  useAccessKeyStore.setState({ key: 'key', rejected: false });
  queryClient.clear();
  mockCalendar.mockReset().mockResolvedValue(DATA);
  jest.mocked(getCommodities).mockReturnValue(new Promise(() => {}));
  jest.mocked(getSettings).mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  jest.useRealTimers();
});

const renderCalendar = () => renderRouter('src/app', { initialUrl: '/calendar' });

describe('휴장 달력', () => {
  it('이번 달~다다음 달 범위를 앞뒤 하루씩 넓혀 조회하고 3개월을 세로로 보여 준다', async () => {
    await renderCalendar();

    expect(await screen.findByText('2026년 11월')).toBeOnTheScreen();
    expect(screen.getByText('2026년 12월')).toBeOnTheScreen();
    expect(screen.getByText('2027년 1월')).toBeOnTheScreen();
    expect(mockCalendar).toHaveBeenCalledWith('2026-10-31', '2027-02-01', expect.anything());
  });

  it('오늘과 시장별 휴장·조기 마감을 기기 로컬 날짜 칸에 로컬 시각으로 표시한다', async () => {
    await renderCalendar();

    expect(await screen.findByLabelText('11월 21일, 오늘')).toBeOnTheScreen();
    // NYSE 휴장은 개장 09:30 ET = 23:30 KST라 같은 날, CME 13:30 CT 중단은 다음 날 04:30 KST
    expect(screen.getByLabelText('11월 26일, NYSE 휴장')).toBeOnTheScreen();
    expect(screen.getByLabelText('11월 27일, CME 휴장 (04:30 거래 중단)')).toBeOnTheScreen();
    expect(screen.getByLabelText('11월 28일, NYSE 조기 마감 03:00')).toBeOnTheScreen();
    expect(screen.getByLabelText('11월 20일')).toBeOnTheScreen();
  });

  it('달마다 아래에 휴일 이름 목록을 붙이고, 없으면 없다고 쓴다', async () => {
    await renderCalendar();

    const nov = await screen.findByTestId('calendar-month-2026-11');
    expect(within(nov).getAllByText('11/26 (목)')).toHaveLength(1);
    expect(within(nov).getByText('11/28 (토)')).toBeOnTheScreen();
    expect(within(nov).getByText(/Day after Thanksgiving/)).toBeOnTheScreen();
    const jan = screen.getByTestId('calendar-month-2027-1');
    expect(within(jan).getByText(/개장 지연 10:00 ·/)).toBeOnTheScreen();

    mockCalendar.mockResolvedValue({ ...DATA, exceptions: [] });
    queryClient.clear();
    await renderCalendar();
    expect(await screen.findAllByText('휴장·단축 거래 없음')).toHaveLength(3);
  });

  it('넓혀 받은 하루 때문에 생긴 화면 밖 연도의 미입력은 안내하지 않는다', async () => {
    mockCalendar.mockResolvedValue({
      ...DATA,
      missing: [
        { market: 'NYSE', year: 2026 },
        { market: 'KRX', year: 2025 },
      ],
    });
    await renderCalendar();

    expect(await screen.findByText('NYSE 2026년 휴장 정보가 아직 없습니다')).toBeOnTheScreen();
    expect(screen.queryByText('KRX 2025년 휴장 정보가 아직 없습니다')).toBeNull();
  });

  it('입력되지 않은 시장·연도를 안내한다', async () => {
    mockCalendar.mockResolvedValue({ ...DATA, missing: [{ market: 'KRX', year: 2027 }] });
    await renderCalendar();

    expect(await screen.findByText('KRX 2027년 휴장 정보가 아직 없습니다')).toBeOnTheScreen();
  });

  it('A title-bar의 달력 버튼으로 들어온다', async () => {
    await renderRouter('src/app', { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('button', { name: '휴장 달력' }));

    expect(screen).toHavePathname('/calendar');
  });
});
