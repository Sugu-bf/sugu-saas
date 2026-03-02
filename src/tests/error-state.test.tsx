import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorState } from "@/components/feedback/error-state";

describe("ErrorState", () => {
  it("renders default title and description", () => {
    render(<ErrorState />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
    expect(
      screen.getByText("Impossible de charger les données. Veuillez réessayer."),
    ).toBeInTheDocument();
  });

  it("renders custom title and description", () => {
    render(<ErrorState title="Erreur réseau" description="Vérifiez votre connexion." />);

    expect(screen.getByText("Erreur réseau")).toBeInTheDocument();
    expect(screen.getByText("Vérifiez votre connexion.")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = () => {};
    render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
