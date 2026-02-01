import { render, screen } from "@testing-library/react";
import { HealthPanel } from "./HealthPanel";

test("renders loading initially", () => {
  render(<HealthPanel />);
  expect(screen.getByTestId("health-json")).toHaveTextContent("loading");
});
