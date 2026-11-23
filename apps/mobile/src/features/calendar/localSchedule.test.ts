import type { CalendarException } from '@futureetp/shared';
import {
  toLocalException,
  toLocalExceptions,
  widenRange,
  zonedTimeToInstant,
} from './localSchedule';

const ex = (
  e: Partial<CalendarException> & Pick<CalendarException, 'market' | 'date'>,
): CalendarException => ({ kind: 'CLOSED', at: null, note: '', ...e });

describe('localSchedule', () => {
  it('시장 벽시계 시각을 서머타임에 맞춰 UTC로 바꾼다', () => {
    expect(
      new Date(zonedTimeToInstant('2026-11-27', '13:00', 'America/New_York')).toISOString(),
    ).toBe('2026-11-27T18:00:00.000Z');
    expect(
      new Date(zonedTimeToInstant('2026-07-03', '13:30', 'America/Chicago')).toISOString(),
    ).toBe('2026-07-03T18:30:00.000Z');
    // 서머타임 시작일(3/8 02:00 CST → 03:00 CDT) 당일 오후
    expect(
      new Date(zonedTimeToInstant('2026-03-08', '17:00', 'America/Chicago')).toISOString(),
    ).toBe('2026-03-08T22:00:00.000Z');
  });

  it('시각이 있는 일정은 그 시각의 로컬 날짜·시각으로 옮긴다', () => {
    const halt = ex({ market: 'CME', date: '2026-11-26', kind: 'HALT', at: '13:30' });
    expect(toLocalException(halt, 'Asia/Seoul')).toMatchObject({
      localDate: '2026-11-27',
      localTime: '04:30',
    });
    expect(toLocalException(halt, 'America/Los_Angeles')).toMatchObject({
      localDate: '2026-11-26',
      localTime: '11:30',
    });
    const lateOpen = ex({ market: 'KRX', date: '2027-01-04', kind: 'LATE_OPEN', at: '10:00' });
    expect(toLocalException(lateOpen, 'America/New_York')).toMatchObject({
      localDate: '2027-01-03',
      localTime: '20:00',
    });
  });

  it('휴장은 그 시장 정규 개장 시각의 로컬 날짜에 둔다', () => {
    const nyse = ex({ market: 'NYSE', date: '2026-11-26' });
    expect(toLocalException(nyse, 'Asia/Seoul')).toMatchObject({
      localDate: '2026-11-26',
      localTime: null,
    });
    // CME 거래일 세션은 전날 17:00 CT에 열린다
    const cme = ex({ market: 'CME', date: '2026-12-25' });
    expect(toLocalException(cme, 'Asia/Seoul').localDate).toBe('2026-12-25');
    expect(toLocalException(cme, 'America/Chicago').localDate).toBe('2026-12-24');
    const krx = ex({ market: 'KRX', date: '2026-12-31' });
    expect(toLocalException(krx, 'America/New_York').localDate).toBe('2026-12-30');
  });

  it('로컬 날짜순, 같은 날은 시장 순으로 정렬한다', () => {
    const list = toLocalExceptions(
      [
        ex({ market: 'CME', date: '2026-12-24', kind: 'EARLY_CLOSE', at: '12:45' }),
        ex({ market: 'NYSE', date: '2026-12-25' }),
        ex({ market: 'CME', date: '2026-12-25' }),
      ],
      'Asia/Seoul',
    );
    expect(list.map((e) => [e.localDate, e.market, e.date])).toEqual([
      ['2026-12-25', 'CME', '2026-12-24'],
      ['2026-12-25', 'CME', '2026-12-25'],
      ['2026-12-25', 'NYSE', '2026-12-25'],
    ]);
  });

  it('조회 범위를 앞뒤 하루씩 넓힌다', () => {
    expect(widenRange({ from: '2027-01-01', to: '2027-02-28' })).toEqual({
      from: '2026-12-31',
      to: '2027-03-01',
    });
  });
});
