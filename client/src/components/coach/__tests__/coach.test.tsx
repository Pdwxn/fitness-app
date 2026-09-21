import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { ApiError } from "@/lib/api/authenticated-client";
import type { CoachChange, RoutineEditProposal } from "@/types/coach";

const push = vi.fn();
const usePendingProposal = vi.fn();
const approveProposal = vi.fn();
const rejectProposal = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));
vi.mock("@/hooks/usePendingProposal", () => ({ usePendingProposal: () => usePendingProposal() }));
vi.mock("@/lib/api/coach", () => ({
  approveProposal: (id: string) => approveProposal(id),
  rejectProposal: (id: string) => rejectProposal(id),
}));

const { CoachReviewContent } = await import("../CoachReviewContent");
const { CoachChangeCard } = await import("../CoachChangeCard");
const { CoachProposalBanner } = await import("../CoachProposalBanner");

const changes: CoachChange[] = [
  {
    type: "adjust_load",
    day_number: 1,
    exercise_name: "Press de banca",
    exercise_id: "e1",
    weight_change_percent: 5,
    sets_delta: -1,
    why: "Completaste todo con holgura",
  },
  {
    type: "substitute_exercise",
    day_number: 2,
    exercise_name: "Press militar",
    exercise_id: "e2",
    new_exercise: { name: "Press Arnold", muscle_group: "hombro", external_id: "x", search_term: "arnold" },
    why: "Molestia en el hombro",
  },
  {
    type: "add_exercise",
    day_number: 3,
    exercise: {
      name: "Face pull",
      muscle_group: "deltoide",
      external_id: "y",
      search_term: "face pull",
      sets: 3,
      reps: "12-15",
      weight_kg: null,
      rest_seconds: null,
    },
    why: "Falta deltoide posterior",
  },
  { type: "remove_exercise", day_number: 3, exercise_name: "Curl femoral", exercise_id: "e3", why: "Lo omitiste" },
];

const proposal: RoutineEditProposal = {
  id: "p1",
  routine: "r1",
  status: "pending",
  target_month: 10,
  target_year: 2026,
  summary: "Sube el press y cambia el hombro",
  changes,
  created_at: "2026-09-30T00:00:00Z",
  decided_at: null,
};

function renderWithIntl(ui: React.ReactElement, locale: "es" | "en" = "es") {
  const messages = locale === "es" ? es : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  approveProposal.mockReset();
  rejectProposal.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  usePendingProposal.mockReturnValue({ proposal, isLoading: false, isError: false });
});

describe("CoachChangeCard", () => {
  it("renders an adjustment with signed deltas and the reason", () => {
    renderWithIntl(<CoachChangeCard change={changes[0]} />);
    expect(screen.getByText("Press de banca")).toBeInTheDocument();
    expect(screen.getByText("Peso +5%")).toBeInTheDocument();
    expect(screen.getByText("Series -1")).toBeInTheDocument();
    expect(screen.getByText(/Completaste todo con holgura/)).toBeInTheDocument();
    expect(screen.getByText("Ajuste de carga")).toBeInTheDocument();
  });

  it("renders a substitution as from -> to", () => {
    renderWithIntl(<CoachChangeCard change={changes[1]} />);
    expect(screen.getByRole("heading", { name: "Press militar → Press Arnold" })).toBeInTheDocument();
  });

  it("renders an addition with its prescription", () => {
    renderWithIntl(<CoachChangeCard change={changes[2]} />);
    expect(screen.getByText("Face pull")).toBeInTheDocument();
    expect(screen.getByText("3 series x 12-15 reps")).toBeInTheDocument();
  });

  it("renders a removal", () => {
    renderWithIntl(<CoachChangeCard change={changes[3]} />);
    expect(screen.getByText("Curl femoral")).toBeInTheDocument();
    expect(screen.getByText("Quitar ejercicio")).toBeInTheDocument();
  });

  it("is translated to English", () => {
    renderWithIntl(<CoachChangeCard change={changes[0]} />, "en");
    expect(screen.getByText("Weight +5%")).toBeInTheDocument();
    expect(screen.getByText("Load adjustment")).toBeInTheDocument();
  });
});

describe("CoachReviewContent", () => {
  it("lists every change with the summary", () => {
    renderWithIntl(<CoachReviewContent locale="es" />);
    expect(screen.getByText("Sube el press y cambia el hombro")).toBeInTheDocument();
    expect(screen.getByText("4 cambios propuestos")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("shows an empty state with no pending proposal", () => {
    usePendingProposal.mockReturnValue({ proposal: null, isLoading: false, isError: false });
    renderWithIntl(<CoachReviewContent locale="es" />);
    expect(screen.getByText("Sin propuestas pendientes")).toBeInTheDocument();
    expect(screen.getByText("Tu rutina está al día.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a Rutina activa" })).toHaveAttribute("href", "/es/routine");
  });

  it("approving calls the API, confirms and goes to the dashboard", async () => {
    approveProposal.mockResolvedValue({ id: "r1", weeks: [] });
    renderWithIntl(<CoachReviewContent locale="es" />);

    await userEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/es/dashboard"));
    expect(approveProposal).toHaveBeenCalledWith("p1");
    expect(rejectProposal).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith("Listo, tu rutina fue actualizada.");
  });

  it("keeping the routine calls reject, never approve", async () => {
    rejectProposal.mockResolvedValue({ id: "r1", weeks: [] });
    renderWithIntl(<CoachReviewContent locale="es" />);

    await userEvent.click(screen.getByRole("button", { name: "Mantener mi rutina" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/es/dashboard"));
    expect(rejectProposal).toHaveBeenCalledWith("p1");
    expect(approveProposal).not.toHaveBeenCalled();
  });

  it("explains a 409 conflict and stays on the page", async () => {
    approveProposal.mockRejectedValue(new ApiError(409, "stale", "proposal_stale"));
    renderWithIntl(<CoachReviewContent locale="es" />);

    await userEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Tu rutina cambió");
    expect(toastError).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // Applying can't work any more, but keeping the routine still can.
    expect(screen.getByRole("button", { name: "Aplicar cambios" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mantener mi rutina" })).toBeEnabled();
  });
});

describe("CoachProposalBanner", () => {
  it("links to the review page when a proposal is pending", () => {
    renderWithIntl(<CoachProposalBanner locale="es" />);
    expect(screen.getByRole("link", { name: "Revisar" })).toHaveAttribute("href", "/es/routine/review");
  });

  it("renders nothing without a proposal", () => {
    usePendingProposal.mockReturnValue({ proposal: null, isLoading: false, isError: false });
    const { container } = renderWithIntl(<CoachProposalBanner locale="es" />);
    expect(container).toBeEmptyDOMElement();
  });
});
