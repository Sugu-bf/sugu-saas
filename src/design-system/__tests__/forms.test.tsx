import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Checkbox, Radio, RadioGroup, Switch } from "../forms/choice";
import { Combobox, searchOptions } from "../forms/combobox";
import { FormErrorSummary, fieldErrorsFromZod } from "../forms/errors";
import { FormField } from "../forms/field";
import { Input, Select, Textarea } from "../forms/input";
import { FormActions, StepActions, Stepper } from "../forms/stepper";
import { Button } from "../primitives/button";

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

describe("Stepper with selectable steps, FormActions", () => {
  const steps = [
    { id: "product", label: "Produit" },
    { id: "price", label: "Prix" },
    { id: "summary", label: "Résumé" },
  ];
  const nav = () => screen.getByRole("navigation", { name: "Création d'un produit" });
  const step = (name: RegExp) => within(nav()).getByRole("button", { name });

  it("makes every step a button, at every width, and lets the page decide the move", async () => {
    const onStepSelect = vi.fn();
    render(<Stepper label="Création d'un produit" steps={steps} currentStep={1} onStepSelect={onStepSelect} />);

    expect(within(nav()).getAllByRole("button")).toHaveLength(3);
    // The compact phone bar is replaced by the steps themselves.
    expect(within(nav()).queryByRole("progressbar")).toBeNull();
    expect(step(/Prix/)).toHaveAttribute("aria-current", "step");
    expect(step(/Produit/)).toHaveTextContent("(terminée)");

    await userEvent.click(step(/Résumé/));
    expect(onStepSelect).toHaveBeenCalledWith(2);
  });

  it("ticks only the steps reported complete, wherever they stand", () => {
    render(<Stepper label="Création d'un produit" steps={steps} currentStep={1} completedSteps={["summary"]} onStepSelect={() => {}} />);
    // Passed, but with something missing: no tick.
    expect(step(/Produit/)).not.toHaveTextContent("(terminée)");
    expect(step(/Résumé/)).toHaveTextContent("(terminée)");
  });

  it("keeps the current step identifiable among the steps in error", () => {
    render(<Stepper label="Création d'un produit" steps={steps} currentStep={0} errorSteps={["product", "price"]} onStepSelect={() => {}} />);
    expect(step(/Produit/)).toHaveAttribute("aria-current", "step");
    expect(step(/Produit/)).toHaveTextContent("(à corriger)");
    expect(step(/Prix/)).toHaveTextContent("(à corriger)");
    expect(step(/Prix/)).not.toHaveAttribute("aria-current");
  });

  it("FormActions lays its actions in one row, and rests on the shell when sticky", () => {
    render(
      <FormActions sticky>
        <Button>Annuler</Button>
        <Button variant="primary">Enregistrer</Button>
      </FormActions>,
    );
    const bar = screen.getByRole("button", { name: "Enregistrer" }).parentElement as HTMLElement;
    expect(bar).toHaveClass("flex", "items-center", "sticky", "sticky-bottom-shell");
    expect(bar.className).not.toContain("flex-col");
  });
});

describe("Combobox", () => {
  const options = [
    { value: "c1", label: "Bijoux" },
    { value: "c2", label: "Épicerie" },
    { value: "c3", label: "Maison et décoration" },
    { value: "c4", label: "Textile" },
    { value: "c5", label: "Décoration de fête" },
  ];

  /** The field as a page uses it: it owns what is chosen, and shows it. */
  function Field({ limit, disabled }: { limit?: number; disabled?: boolean }) {
    const [chosen, setChosen] = useState<string[]>([]);
    return (
      <>
        <FormField label="Catégorie" required hint="Recherchez par nom.">
          <Combobox
            options={options}
            selected={chosen}
            onToggle={(value) => setChosen((current) => (current.includes(value) ? current.filter((other) => other !== value) : [...current, value]))}
            listLabel="Catégories"
            placeholder="Rechercher une catégorie"
            limit={limit}
            disabled={disabled}
            required={false}
          />
        </FormField>
        <p data-testid="chosen">{chosen.join(",")}</p>
      </>
    );
  }

  const field = () => screen.getByRole("combobox", { name: /Catégorie/ });
  const listed = () => within(screen.getByRole("listbox", { name: "Catégories" })).getAllByRole("option");
  const labels = () => listed().map((option) => option.textContent);
  const activeOption = () => document.getElementById(field().getAttribute("aria-activedescendant") ?? "");

  it("ranks what a search finds: a label that starts with it, then a word that does, then anywhere", () => {
    const found = (query: string) => searchOptions(options, query).map((option) => option.label);
    // Accents and case are ignored, on both sides.
    expect(found("DEC")).toEqual(["Décoration de fête", "Maison et décoration"]);
    expect(found("epic")).toEqual(["Épicerie"]);
    // Inside a word: the order given by the caller is kept.
    expect(found("ti")).toEqual(["Maison et décoration", "Textile", "Décoration de fête"]);
    expect(found("  ")).toEqual(options.map((option) => option.label));
    // What is typed is text, never a pattern.
    expect(found("(")).toEqual([]);
    expect(found(".*")).toEqual([]);
  });

  it("is a named field that lists on focus, narrows as one types and says what it found", async () => {
    render(<Field />);
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).toBeNull();

    await userEvent.click(field());
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(field()).toHaveAttribute("aria-controls", screen.getByRole("listbox", { name: "Catégories" }).id);
    expect(listed()).toHaveLength(5);

    await userEvent.type(field(), "deco");
    expect(labels()).toEqual(["Décoration de fête", "Maison et décoration"]);
    expect(screen.getByRole("status")).toHaveTextContent("2 résultats");

    await userEvent.clear(field());
    await userEvent.type(field(), "zzz");
    expect(screen.getByText("Aucun résultat pour « zzz ».")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Aucun résultat");
  });

  it("chooses with the keyboard, and never submits the form it sits in", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Field />
      </form>,
    );
    await userEvent.click(field());
    await userEvent.type(field(), "tex");
    expect(activeOption()).toHaveTextContent("Textile");

    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("chosen")).toHaveTextContent("c4");
    expect(onSubmit).not.toHaveBeenCalled();
    // Closed and emptied for the next search; the keyboard user stays in the field.
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();

    // Open again: what is chosen is ticked, the arrows move, Enter takes a choice back.
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Textile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Bijoux" })).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(activeOption()).toHaveTextContent("Textile");
    await userEvent.keyboard("{ArrowUp}");
    expect(activeOption()).toHaveTextContent("Maison et décoration");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("chosen")).toHaveTextContent("c4,c3");

    await userEvent.type(field(), "text");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByTestId("chosen")).toHaveTextContent(/^c3$/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Escape closes the list first, then empties the search", async () => {
    render(<Field />);
    await userEvent.click(field());
    await userEvent.type(field(), "bij");
    await userEvent.keyboard("{Escape}");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveValue("bij");
    await userEvent.keyboard("{Escape}");
    expect(field()).toHaveValue("");
  });

  it("chooses with a click, which leaves the field so a phone puts its keyboard away", async () => {
    render(<Field />);
    await userEvent.click(field());
    await userEvent.click(screen.getByRole("option", { name: "Bijoux" }));
    expect(screen.getByTestId("chosen")).toHaveTextContent("c1");
    expect(field()).not.toHaveFocus();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("lists a limited number of options and says how many are left to search for", async () => {
    render(<Field limit={2} />);
    await userEvent.click(field());
    expect(labels()).toEqual(["Bijoux", "Épicerie"]);
    expect(screen.getByText("3 autres : précisez la recherche.")).toBeInTheDocument();
    await userEvent.type(field(), "tex");
    expect(screen.queryByText(/précisez la recherche/)).toBeNull();
  });

  it("closes when the focus leaves it, and stays closed while disabled", async () => {
    const { rerender } = render(<Field />);
    await userEvent.click(field());
    expect(field()).toHaveAttribute("aria-expanded", "true");
    await userEvent.tab();
    expect(field()).toHaveAttribute("aria-expanded", "false");

    rerender(<Field disabled />);
    expect(field()).toBeDisabled();
    await userEvent.click(field());
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
