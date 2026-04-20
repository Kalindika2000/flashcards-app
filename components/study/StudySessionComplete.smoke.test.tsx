import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudySessionComplete from "./StudySessionComplete";

describe("StudySessionComplete (smoke)", () => {
  it("renders completion state and primary actions", () => {
    const onBack = vi.fn();
    const onRestart = vi.fn();

    render(
      <StudySessionComplete
        allMastered
        someKnown={false}
        restartMode="all"
        onRestartModeChange={vi.fn()}
        onBackToModes={onBack}
        onRestart={onRestart}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /session complete/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mastered all flashcards/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to study modes/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("shows restart scope when not all mastered but some are known", () => {
    render(
      <StudySessionComplete
        allMastered={false}
        someKnown
        restartMode="difficult"
        onRestartModeChange={vi.fn()}
        onBackToModes={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText(/reviewed all cards/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/all cards/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/difficult cards only/i)).toBeInTheDocument();
  });
});
