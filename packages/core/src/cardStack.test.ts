import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOT_ID,
  reduceCardStack,
  push,
  pop,
  reset,
  setStack,
  getBreadcrumb,
  type CardStackState
} from "./cardStack";

describe("card stack", () => {
  const base: CardStackState = { stack: [DEFAULT_ROOT_ID] };

  it("push ignores a duplicate top", () => {
    const next = reduceCardStack(base, push(DEFAULT_ROOT_ID));
    expect(next.stack).toEqual([DEFAULT_ROOT_ID]);
  });

  it("pop keeps root when length is 1", () => {
    const next = reduceCardStack(base, pop());
    expect(next.stack).toEqual([DEFAULT_ROOT_ID]);
  });

  it("setStack with empty falls back to root", () => {
    const next = reduceCardStack({ stack: ["bacteria"] }, setStack([]));
    expect(next.stack).toEqual([DEFAULT_ROOT_ID]);
  });

  it("reset returns only the provided root", () => {
    const stacked = reduceCardStack(base, push("protoplast"));
    const next = reduceCardStack(stacked, reset("bacteria"));
    expect(next.stack).toEqual(["bacteria"]);
  });

  it("breadcrumb returns full stack", () => {
    const stacked = reduceCardStack(base, push("protoplast"));
    const stackedTwice = reduceCardStack(stacked, push("bacteria"));
    expect(getBreadcrumb(stackedTwice)).toEqual([DEFAULT_ROOT_ID, "protoplast", "bacteria"]);
  });
});
