import { useState } from 'react';

/** Current time in UTC seconds, captured once per mount so renders stay pure. */
export function useNowSec(): number {
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  return now;
}
