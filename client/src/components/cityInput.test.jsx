import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { CityInput } from "./cityInput.component";
import { renderWithApp } from "../test/render";

// Holds the value like the pages do, and reports every change
function Field({ onChange, initial = "" }) {
  const [value, setValue] = useState(initial);
  return (
    <CityInput
      label="Qayerdan"
      placeholder="Shahar"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("CityInput", () => {
  it("suggests places as you type, and saves the canonical name of the one you pick", async () => {
    const onChange = vi.fn();
    renderWithApp(<Field onChange={onChange} />);
    const input = await screen.findByPlaceholderText("Shahar");

    fireEvent.change(input, { target: { value: "samarq" } });
    expect(screen.getByText("Samarqand tumani")).toBeTruthy(); // the district is offered too
    fireEvent.click(screen.getByText("Samarqand").closest("button")); // the city
    expect(onChange).toHaveBeenLastCalledWith("Samarqand");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0); // the list closed
  });

  it("saves the canonical name right away when a full name is typed in Russian", async () => {
    const onChange = vi.fn();
    renderWithApp(<Field onChange={onChange} />);
    fireEvent.change(await screen.findByPlaceholderText("Shahar"), { target: { value: "Самарканд" } });
    expect(onChange).toHaveBeenLastCalledWith("Samarqand");
  });

  it("still accepts a place that isn't in the list", async () => {
    const onChange = vi.fn();
    renderWithApp(<Field onChange={onChange} />);
    fireEvent.change(await screen.findByPlaceholderText("Shahar"), { target: { value: "Qishloq 7" } });
    expect(onChange).toHaveBeenLastCalledWith("Qishloq 7");
  });
});
