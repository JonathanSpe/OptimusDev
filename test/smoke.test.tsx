import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { cn } from "@/lib/utils";

test("renders a heading into the jsdom document", () => {
  render(<h1 className={cn("text-foreground")}>Optimus</h1>);

  expect(
    screen.getByRole("heading", { level: 1, name: "Optimus" }),
  ).toBeInTheDocument();
});
