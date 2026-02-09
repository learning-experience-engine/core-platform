import { describe, expect, it } from "vitest";
import {
  reduceCardStack,
  pushCard,
  popCard,
  resetStack,
  goToBreadcrumb,
  setStack,
  type CardStackState
} from "./card-stack";

describe("card stack", () => {
  const base: CardStackState = { stack: ["plant_cell"] };

  it("push adds a new card", () => {
    const next = reduceCardStack(base, pushCard("protoplast"));
    expect(next.stack).toEqual(["plant_cell", "protoplast"]);
  });

  it("pop removes the last card", () => {
    const stacked = reduceCardStack(base, pushCard("protoplast"));
    const next = reduceCardStack(stacked, popCard());
    expect(next.stack).toEqual(["plant_cell"]);
  });

  it("breadcrumb trims to the selected index", () => {
    const stacked = reduceCardStack(base, pushCard("protoplast"));
    const stackedTwice = reduceCardStack(stacked, pushCard("bacteria"));
    const next = reduceCardStack(stackedTwice, goToBreadcrumb(1));
    expect(next.stack).toEqual(["plant_cell", "protoplast"]);
  });

  it("reset replaces the stack", () => {
    const stacked = reduceCardStack(base, pushCard("protoplast"));
    const next = reduceCardStack(stacked, resetStack("bacteria"));
    expect(next.stack).toEqual(["bacteria"]);
  });

  it("set replaces with a provided stack", () => {
    const next = reduceCardStack(base, setStack(["plant_cell", "bacteria"]));
    expect(next.stack).toEqual(["plant_cell", "bacteria"]);
  });
});
