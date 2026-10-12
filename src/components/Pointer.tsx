"use client";

import { useEffect } from "react";
import { afterLoadIdle } from "@/lib/schedule";

/**
  Desktop pointer polish (magnetic buttons + a follower ring). The effect code is its own chunk, requested only
  after window load + idle, so it never weighs on the first load. Fine pointers with full motion only.
*/
export default function Pointer() {
  useEffect(() => {
    let stop = () => {};
    let dead = false;
    const cancel = afterLoadIdle(() => {
      import("@/lib/pointer").then((m) => {
        if (!dead) stop = m.startPointer();
      });
    });
    return () => {
      dead = true;
      cancel();
      stop();
    };
  }, []);
  return null;
}
