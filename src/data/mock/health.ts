export const mockHealthRecent = {
  oldest: "2026-08-20",
  newest: "2026-08-29",
  source: "mock",
  days: [
    makeHealthDay("2026-08-20", 5200, 390),
    makeHealthDay("2026-08-21", 7350, 455),
    makeHealthDay("2026-08-22", 6100, 502),
    makeHealthDay("2026-08-23", 2800, 365),
    makeHealthDay("2026-08-24", 8420, 480),
    makeHealthDay("2026-08-25", 5900, 430),
    makeHealthDay("2026-08-26", 10250, 515),
    makeHealthDay("2026-08-27", 4700, 405),
    makeHealthDay("2026-08-28", 3719, null),
    makeHealthDay("2026-08-29", 1621, 410),
  ],
};

function makeHealthDay(date: string, steps: number, sleepMinutes: number | null) {
  return {
    date,
    available: true,
    source: "mock",
    steps: {
      value: steps,
    },
    sleep: {
      seconds: sleepMinutes === null ? null : sleepMinutes * 60,
      minutes: sleepMinutes,
      hours: sleepMinutes === null ? null : Math.round((sleepMinutes / 60) * 100) / 100,
    },
  };
}
