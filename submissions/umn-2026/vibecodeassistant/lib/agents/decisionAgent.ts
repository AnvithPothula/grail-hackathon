import { hasModelCredentials, providerConfig } from "@/lib/agents/provider";
import { z } from "zod";
import {
  actionSchema,
  type AgentAction,
  type GhostState,
  type Observation,
} from "@/lib/types";
import { demoPrompt } from "./prompts";
import { modelCall } from "./model";
const responseSchema = z.object({ action: actionSchema });
// Deterministic, observation-driven fallback. This chooses actions, never synthesizes reports.
export function demoDecision(g: GhostState, o: Observation): AgentAction {
  const click = (text: string, reasoningSummary: string): AgentAction => {
    const el = o.interactiveElements.find((e) => e.text.includes(text));
    if (!el) throw new Error(`Cannot find ${text}`);
    return { type: "click", elementId: el.id, reasoningSummary };
  };
  const fill = (
    label: string,
    value: string,
    reasoningSummary: string,
  ): AgentAction => ({
    type: "fill",
    elementId: o.interactiveElements.find((e) => e.label === label)!.id,
    value,
    reasoningSummary,
  });
  if (g.id === "first") {
    if (o.visibleText.includes("Account created"))
      return {
        type: "complete",
        outcome: "Reached the welcome dashboard.",
        reasoningSummary:
          "The account is created and the welcome dashboard is visible.",
      };
    if (!o.url.includes("/signup"))
      return click(
        "Create an account →",
        "Follow the obvious account creation link.",
      );
    if (!o.interactiveElements.find((e) => e.label === "Email")?.value)
      return fill("Email", "ghost@example.com", "Enter a valid email address.");
    if (!o.interactiveElements.find((e) => e.label === "Password")?.value)
      return fill(
        "Password",
        "abc",
        "Try a short password and see whether the stated minimum is enforced.",
      );
    return click(
      "Create account",
      "Submit the account form and inspect the result.",
    );
  }
  if (g.id === "shopper") {
    if (!o.url.includes("/cart"))
      return click(
        "Browse products →",
        "Open the product collection to build a cart.",
      );
    if (o.visibleText.includes("Order confirmed"))
      return {
        type: "complete",
        outcome: "Checkout completed after modifying cart.",
        reasoningSummary: "The order confirmation is visible.",
      };
    const removed = g.actions.some(
      (r) => r.locator?.text === "Remove Everyday Notebook",
    );
    if (
      !removed &&
      !o.interactiveElements.some((e) => e.text === "Remove Everyday Notebook")
    )
      return click(
        "Add Everyday Notebook",
        "Add a notebook to start the cart.",
      );
    if (!o.interactiveElements.some((e) => e.text === "Remove Studio Cup"))
      return click(
        "Add Studio Cup",
        "Add a second product before changing the cart.",
      );
    if (!removed)
      return click(
        "Remove Everyday Notebook",
        "Remove one item to verify that the total updates.",
      );
    return click(
      "Complete checkout",
      "Complete checkout with the remaining item.",
    );
  }
  if (o.visibleText.includes("Feedback received"))
    return {
      type: "complete",
      outcome: "Required-field boundary tested.",
      reasoningSummary: "The feedback submission result is visible.",
    };
  if (!o.url.includes("/feedback"))
    return click(
      "Send feedback →",
      "Explore the feedback form and its required fields.",
    );
  return click(
    "Send feedback",
    "Submit an empty message to verify the required-field rule.",
  );
}
export async function decide(
  g: GhostState,
  o: Observation,
): Promise<{ action: AgentAction; mode: string; notice?: string }> {
  if (process.env.DEMO_MODE === "true" || !hasModelCredentials())
    return { action: demoDecision(g, o), mode: "Deterministic demo" };
  try {
    const result = await modelCall(responseSchema, "ghost_action", demoPrompt, {
      persona: g.persona,
      personality: g.personality,
      goal: g.goal,
      observation: o,
      history: g.actions,
      candidates: g.candidateIssues,
      remainingActions: 12 - g.actions.length,
    });
    const action = result.action;
    if (
      (action.type === "click" || action.type === "fill") &&
      !o.interactiveElements.some((e) => e.id === action.elementId)
    )
      throw new Error("Invalid element reference");
    return { action, mode: `${providerConfig().name} agent` };
  } catch {
    /* Clearly labeled demo fallback. */
  }
  return {
    action: demoDecision(g, o),
    mode: "Deterministic fallback",
    notice:
      "Model request failed twice; using the observation-driven demo policy for this step.",
  };
}
