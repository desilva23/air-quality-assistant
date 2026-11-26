import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { HouseholdForm } from "@/components/HouseholdForm";
import { NumberField, SelectField } from "@/components/fields";
import { DEFAULT_HOUSEHOLD, type Household } from "@/lib/domain/household";
import { axeViolations } from "../support/axe";

function Harness({ onChange }: { onChange: (value: Household) => void }) {
  const [value, setValue] = useState(DEFAULT_HOUSEHOLD);
  return (
    <HouseholdForm
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("HouseholdForm", () => {
  it("records who lives there, the commute, the routine and the home", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    expect(screen.queryByLabelText(/Distance each way/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Adults over 60"));
    await user.selectOptions(screen.getByLabelText("How you usually travel"), "Bus");
    const distance = screen.getByLabelText(/Distance each way/);
    await user.clear(distance);
    await user.type(distance, "12.5{Enter}");
    const days = screen.getByLabelText("Days a week");
    await user.clear(days);
    await user.type(days, "6");
    await user.tab();
    await user.selectOptions(screen.getByLabelText("Main outdoor activity"), "Run or jog");
    await user.selectOptions(screen.getByLabelText("Usually in the"), "Evening");
    const minutes = screen.getByLabelText(/For how long/);
    await user.clear(minutes);
    await user.type(minutes, "45");
    await user.tab();
    await user.click(screen.getByLabelText("We have an air purifier"));
    await user.click(screen.getByLabelText("Someone smokes at home"));
    await user.selectOptions(screen.getByLabelText("Cooking fuel"), "Induction or electric");
    await user.selectOptions(screen.getByLabelText("Mask you usually wear outside"), "N95 or FFP2");

    expect(onChange).toHaveBeenLastCalledWith({
      members: { children: false, seniors: true, respiratory: false, pregnant: false },
      commute: { mode: "bus", distanceKm: 12.5, daysPerWeek: 6 },
      activity: { kind: "run", partOfDay: "evening", minutes: 45 },
      home: { purifier: true, cooking: "electric", smoker: true },
      mask: "n95",
    });
    expect(await axeViolations(container)).toEqual([]);

    await user.selectOptions(screen.getByLabelText("Main outdoor activity"), "None");
    expect(screen.queryByLabelText("Usually in the")).not.toBeInTheDocument();

    // Answers save as they change, so submitting the form (Enter) must not reload the page.
    const form = container.querySelector("form");
    expect(form && fireEvent.submit(form)).toBe(false);
  });
});

describe("NumberField", () => {
  it("commits on blur or Enter, clamps to range, and ignores empty or unchanged input", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField label="Days" value={3} min={0} max={7} onCommit={onCommit} />);
    const input = screen.getByLabelText("Days");
    await user.clear(input);
    await user.type(input, "12{Enter}");
    expect(onCommit).toHaveBeenLastCalledWith(7);
    expect(input).toHaveValue(7);
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue(3);
    await user.type(input, "{Escape}");
    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("treats text that isn't a number as no change", () => {
    const onCommit = vi.fn();
    render(<NumberField label="Km" unit="km" value={5} min={0} max={80} onCommit={onCommit} />);
    const input = screen.getByLabelText(/Km/);
    fireEvent.change(input, { target: { value: "1e999" } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(5);
  });
});

describe("SelectField", () => {
  it("passes on only values from its own list", () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Fuel"
        value="a"
        options={["a", "b"] as const}
        labels={{ a: "A", b: "B" }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Fuel"), { target: { value: "zzz" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
