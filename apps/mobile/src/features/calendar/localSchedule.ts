import type { CalendarException, CalendarMarket } from '@futureetp/shared';
import { CALENDAR_MARKETS } from '@futureetp/shared';

// 휴장 달력의 예외 일정(시장 현지 날짜·시각)을 기기 로컬 날짜·시각으로 옮긴다(D-144).
// 시각이 있는 일정은 그 시각을, 휴장(CLOSED)은 그 시장 정규 개장 시각을 로컬로 바꾼 날짜에 둔다.

const MARKET_TIME_ZONES: Record<CalendarMarket, string> = {
  CME: 'America/Chicago',
  KRX: 'Asia/Seoul',
  NYSE: 'America/New_York',
};

// 정규 개장 시각. CME 거래일 세션은 전날 17:00 CT에 열린다(D-061)
const REGULAR_OPEN: Record<CalendarMarket, { dayOffset: number; at: string }> = {
  CME: { dayOffset: -1, at: '17:00' },
  KRX: { dayOffset: 0, at: '09:00' },
  NYSE: { dayOffset: 0, at: '09:30' },
};

export type LocalCalendarException = CalendarException & {
  // 기기 로컬 'YYYY-MM-DD'
  localDate: string;
  // 기기 로컬 'HH:mm'. at이 없는 휴장은 null
  localTime: string | null;
};

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function wallClock(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

const wallAsUtc = (date: string, time: string) => Date.parse(`${date}T${time}:00Z`);

// timeZone의 벽시계 date time → UTC 시각(ms). 오프셋을 두 번 맞춰 서머타임 경계도 처리한다
export function zonedTimeToInstant(date: string, time: string, timeZone: string): number {
  const wall = wallAsUtc(date, time);
  const offsetAt = (instant: number) => {
    const local = wallClock(instant, timeZone);
    return wallAsUtc(local.date, local.time) - instant;
  };
  const guess = wall - offsetAt(wall);
  return wall - offsetAt(guess);
}

// 기기 시간대(IANA). 테스트는 이 함수를 mock해 시간대를 고정한다
export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function toLocalException(e: CalendarException, timeZone: string): LocalCalendarException {
  const marketZone = MARKET_TIME_ZONES[e.market];
  if (e.at !== null) {
    const local = wallClock(zonedTimeToInstant(e.date, e.at, marketZone), timeZone);
    return { ...e, localDate: local.date, localTime: local.time };
  }
  const open = REGULAR_OPEN[e.market];
  const openDate = new Date(Date.parse(`${e.date}T00:00:00Z`) + open.dayOffset * DAY)
    .toISOString()
    .slice(0, 10);
  const local = wallClock(zonedTimeToInstant(openDate, open.at, marketZone), timeZone);
  return { ...e, localDate: local.date, localTime: null };
}

const marketOrder = (m: CalendarMarket) => CALENDAR_MARKETS.indexOf(m);

// 로컬 날짜순, 같은 날은 시장 순·시장 날짜순
export function toLocalExceptions(
  exceptions: readonly CalendarException[],
  timeZone: string,
): LocalCalendarException[] {
  return exceptions
    .map((e) => toLocalException(e, timeZone))
    .sort(
      (a, b) =>
        a.localDate.localeCompare(b.localDate) ||
        marketOrder(a.market) - marketOrder(b.market) ||
        a.date.localeCompare(b.date),
    );
}

// 로컬 날짜로 옮기면 시장 날짜가 하루 앞뒤로 움직이므로 조회 범위를 하루씩 넓힌다
export function widenRange(range: { from: string; to: string }): { from: string; to: string } {
  const shift = (date: string, days: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
  return { from: shift(range.from, -1), to: shift(range.to, 1) };
}
