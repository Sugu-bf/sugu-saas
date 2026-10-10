import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Checkbox, Radio, RadioGroup, Switch } from "../forms/choice";
import { FormErrorSummary, fieldErrorsFromZod } from "../forms/errors";
import { FormField } from "../forms/field";
import { Input, Select, Textarea } from "../forms/input";
import { StepActions, Stepper } from "../forms/stepper";

describe("FormField", () => {
  it("links the label to the control", async () => {
    render(
      <FormField label="Nom du client">
        <Input />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Nom du client" });
    await userEvent.click(screen.getByText("Nom du client"));
    expect(input).toHaveFocus();
  });

  it("describes the control with its hint", () => {
    render(
      <FormField label="Téléphone" hint="Le coursier appellera ce numéro.">
        <Input />
      </FormField>,
    );
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Le coursier appellera ce numéro.");
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and announces the error", () => {
    const { rerender } = render(
      <FormField label="Montant" hint="En francs.">
        <Input />
      </FormField>,
    );
    rerender(
      <FormField label="Montant" hint="En francs." error="Indiquez un montant.">
        <Input />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Indiquez un montant. En francs.");
    expect(screen.getByRole("alert")).toHaveTextContent("Indiquez un montant.");
  });

  it("flags required fields for sighted and screen-reader users", () => {
    render(
      <FormField label="Agence" required>
        <Select options={[{ value: "a", label: "Agence Démo" }]} placeholder="Choisir une agence" />
      </FormField>,
    );
    const select = screen.getByRole("combobox", { name: /Agence/ });
    expect(select).toBeRequired();
    expect(screen.getByText("(obligatoire)")).toHaveClass("sr-only");
  });

  it("disables the control from the field", () => {
    render(
      <FormField label="Référence" disabled>
        <Textarea />
      </FormField>,
    );
    expect(screen.getByRole("textbox", { name: "Référence" })).toBeDisabled();
  });

  it("shows a success message, but never alongside an error", () => {
    const { rerender } = render(
      <FormField label="Code" success="Code vérifié.">
        <Input />
      </FormField>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Code vérifié.");
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Code vérifié.");
    rerender(
      <FormField label="Code" success="Code vérifié." error="Code incorrect.">
        <Input />
      </FormField>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Code incorrect.");
  });

  it("lets explicit props on the control win", () => {
    render(
      <FormField label="Nom" id="from-field">
        <Input id="explicit" aria-label="Nom explicite" />
      </FormField>,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "explicit");
  });
});

describe("Input, Select", () => {
  it("Input works alone with an aria-label and shows its suffix", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Montant" suffix="FCFA" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Montant" }), "500");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(screen.getByText("FCFA")).toBeInTheDocument();
  });

  it("Select renders placeholder and options, and reports changes", async () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Agence"
        placeholder="Choisir une agence"
        options={[
          { value: "a", label: "Agence Démo Centre" },
          { value: "b", label: "Agence Démo Ouest", disabled: true },
        ]}
        defaultValue=""
        onChange={onChange}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Agence" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choisir une agence",
      "Agence Démo Centre",
      "Agence Démo Ouest",
    ]);
    expect(within(select).getByRole("option", { name: "Agence Démo Ouest" })).toBeDisabled();
    await userEvent.selectOptions(select, "a");
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe("Checkbox, RadioGroup, Switch", () => {
  it("Checkbox toggles from its label and from the keyboard", async () => {
    function Harness() {
      const [checked, setChecked] = useState(false);
      return <Checkbox label="Colis fragile" checked={checked} onChange={(event) => setChecked(event.target.checked)} />;
    }
    render(<Harness />);
    const checkbox = screen.getByRole("checkbox", { name: /Colis fragile/ });
    await userEvent.click(screen.getByText("Colis fragile"));
    expect(checkbox).toBeChecked();
    checkbox.focus();
    await userEvent.keyboard(" ");
    expect(checkbox).not.toBeChecked();
  });

  it("Checkbox exposes the indeterminate state", () => {
    render(<Checkbox aria-label="Tout sélectionner" indeterminate readOnly checked={false} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(true);
  });

  it("RadioGroup is a named group; one option at a time; disabled options stay off", async () => {
    function Harness() {
      const [value, setValue] = useState("cod");
      return (
        <RadioGroup label="Mode de paiement" value={value} onValueChange={setValue} required>
          <Radio value="cod" label="À la livraison" />
          <Radio value="online" label="Payé en ligne" />
          <Radio value="credit" label="À crédit" disabled />
        </RadioGroup>
      );
    }
    render(<Harness />);
    const group = screen.getByRole("group", { name: /Mode de paiement/ });
    expect(within(group).getByRole("radio", { name: "À la livraison" })).toBeChecked();
    await userEvent.click(within(group).getByRole("radio", { name: "Payé en ligne" }));
    expect(within(group).getByRole("radio", { name: "Payé en ligne" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "À la livraison" })).not.toBeChecked();
    expect(within(group).getByRole("radio", { name: "À crédit" })).toBeDisabled();
  });

  it("RadioGroup announces its error", () => {
    render(
      <RadioGroup label="Mode de paiement" value={undefined} onValueChange={vi.fn()} error="Choisissez un mode.">
        <Radio value="cod" label="À la livraison" />
      </RadioGroup>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez un mode.");
    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true");
  });

  it("Switch is a labelled switch operable with click, Space and Enter", async () => {
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <FormField label="Prévenir le client par SMS">
          <Switch checked={checked} onCheckedChange={setChecked} />
        </FormField>
      );
    }
    render(<Harness />);
    const control = screen.getByRole("switch", { name: "Prévenir le client par SMS" });
    expect(control).toHaveAttribute("aria-checked", "false");
    await userEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    control.focus();
    await userEvent.keyboard(" ");
    expect(control).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{Enter}");
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("a disabled Switch does not change", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Notifications" checked={false} onCheckedChange={onCheckedChange} disabled />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Zod integration", () => {
  const schema = z.object({
    customer: z.string().min(2, "Indiquez le nom du client."),
    address: z.object({ city: z.string().min(1, "Indiquez la ville.") }),
    amount: z.number().positive("Montant supérieur à 0.").max(10, "Trop élevé."),
  });

  it("keeps the first message per field, keyed by dotted path", () => {
    const parsed = schema.safeParse({ customer: "", address: { city: "" }, amount: -1 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(fieldErrorsFromZod(parsed.error)).toEqual({
      customer: "Indiquez le nom du client.",
      "address.city": "Indiquez la ville.",
      amount: "Montant supérieur à 0.",
    });
  });

  it("summary lists the errors and links each one to its field", () => {
    render(
      <FormErrorSummary
        errors={{ customer: "Indiquez le nom du client.", amount: "Montant supérieur à 0." }}
        fields={{ customer: { label: "Client", id: "f-customer" }, amount: { label: "Montant" } }}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("2 champs à corriger");
    expect(within(alert).getByRole("link", { name: "Client : Indiquez le nom du client." })).toHaveAttribute("href", "#f-customer");
    expect(alert).toHaveTextContent("Montant : Montant supérieur à 0.");
  });

  it("summary renders nothing without errors", () => {
    const { container } = render(<FormErrorSummary errors={{}} fields={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Stepper and StepActions", () => {
  const steps = [
    { id: "product", label: "Produit" },
    { id: "price", label: "Prix" },
    { id: "summary", label: "Résumé" },
  ];

  it("marks the current step, completed steps and steps with errors", () => {
    render(<Stepper label="Création d'un produit" steps={steps} currentStep={1} errorSteps={["product"]} />);
    const nav = screen.getByRole("navigation", { name: "Création d'un produit" });
    const items = within(nav).getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).toHaveTextContent("(à corriger)");
    expect(items[2]).not.toHaveAttribute("aria-current");
    const progress = within(nav).getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(progress).toHaveAttribute("aria-valuetext", "Étape 2 sur 3 : Prix");
  });

  it("offers Suivant, then Précédent, then the final action", async () => {
    const handlers = { onPrevious: vi.fn(), onNext: vi.fn(), onSubmit: vi.fn() };
    const { rerender } = render(<StepActions isFirstStep isLastStep={false} submitLabel="Publier" {...handlers} />);
    expect(screen.queryByRole("button", { name: "Précédent" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(handlers.onNext).toHaveBeenCalledOnce();

    rerender(<StepActions isFirstStep={false} isLastStep submitLabel="Publier" {...handlers} />);
    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Précédent" }));
    await userEvent.click(screen.getByRole("button", { name: "Publier" }));
    expect(handlers.onPrevious).toHaveBeenCalledOnce();
    expect(handlers.onSubmit).toHaveBeenCalledOnce();

    rerender(<StepActions isFirstStep={false} isLastStep submitLabel="Publier" submitting {...handlers} />);
    expect(screen.getByRole("button", { name: "Publier" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();
  });
});
