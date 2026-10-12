import { useState } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../primitives/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from "../primitives/dialog";
import { Sheet, SheetContent, SheetTrigger } from "../primitives/sheet";

function DialogHarness() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Modifier le stock</Button>
      </DialogTrigger>
      <DialogContent
        title="Modifier le stock"
        description="Pagne tissé (démo)"
        footer={
          <DialogClose asChild>
            <Button variant="primary">Enregistrer</Button>
          </DialogClose>
        }
      >
        <input aria-label="Quantité" />
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens as a named, described modal with focus inside", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Modifier le stock" }));
    const dialog = screen.getByRole("dialog", { name: "Modifier le stock" });
    expect(dialog).toHaveAccessibleDescription("Pagne tissé (démo)");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    // Portalled outside the page scope: it carries the scope itself.
    expect(dialog).toHaveClass("sugu-ui");
  });

  it("keeps Tab inside the dialog", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Modifier le stock" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await userEvent.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape and gives focus back to the trigger", async () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Modifier le stock" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("closes from the close button and from a footer action", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Modifier le stock" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Modifier le stock" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

function ConfirmHarness({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Supprimer</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Supprimer ce produit ?"
        description="Cette action est définitive."
        confirmLabel="Supprimer définitivement"
        confirmIcon={Trash2}
        onConfirm={onConfirm}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("is an alert dialog that focuses the safe choice", async () => {
    render(<ConfirmHarness onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = screen.getByRole("alertdialog", { name: "Supprimer ce produit ?" });
    expect(dialog).toHaveAccessibleDescription("Cette action est définitive.");
    expect(within(dialog).getByRole("button", { name: "Annuler" })).toHaveFocus();
    expect(within(dialog).getByRole("button", { name: "Supprimer définitivement" })).toHaveClass("bg-danger-solid");
  });

  it("cancels without running the action, via the button or Escape", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("waits for an async action, blocks double submission, then closes", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    const confirm = screen.getByRole("button", { name: "Supprimer définitivement" });
    await userEvent.click(confirm);
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  // The button is drawn disabled on the render that follows the first click: a double click lands before it.
  it("confirms once when two clicks land before the button is drawn disabled", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    const confirm = screen.getByRole("button", { name: "Supprimer définitivement" });
    act(() => {
      confirm.click();
      confirm.click();
    });
    expect(onConfirm).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("stays open when the action fails, so the user can retry", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("network"));
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await userEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Supprimer définitivement" })).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("Sheet", () => {
  it("is a named dialog that closes on Escape", async () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Filtres</Button>
        </SheetTrigger>
        <SheetContent side="bottom" title="Filtres">
          <p>Contenu</p>
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Filtres" }));
    expect(screen.getByRole("dialog", { name: "Filtres" })).toHaveClass("sugu-ui");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
