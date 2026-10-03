import { hasModelCredentials, providerConfig } from "@/lib/agents/provider";
import {
  actionSchema,
  type GhostState,
  type Observation,
  type AgentAction,
  type RunState,
} from "@/lib/types";
import { z } from "zod";
import { modelCall } from "./model";
import { systemPrompt } from "./prompts";
import { riskyAction } from "@/lib/security/target";
export function actionAllowed(
  action: AgentAction,
  obs: Observation,
  run: Pick<RunState, "profile" | "target" | "allowForms">,
): boolean {
  if (run.profile === "demo") return true;
  if (action.type === "press") return action.key !== "Enter";
  if (action.type !== "click" && action.type !== "fill") return true;
  const el = obs.interactiveElements.find((e) => e.id === action.elementId);
  if (!el || el.disabled) return false;
  if (action.type === "fill")
    return (
      el.inputType !== "password" &&
      el.inputType !== "file" &&
      el.role === "textbox"
    );
  if (
    riskyAction.test(
      [el.text, el.label, el.href, el.formText, el.formAction].join(" "),
    )
  )
    return false;
  if (el.href) {
    try {
      return new URL(el.href, obs.url).origin === new URL(run.target).origin;
    } catch {
      return false;
    }
  }
  if (el.role === "button") return !el.inForm || run.allowForms;
  return false;
}
export function heuristicDecision(
  g: GhostState,
  o: Observation,
  run: RunState,
): AgentAction {
  const used = new Set(
    g.actions
      .filter((r) => r.action.type === "click")
      .map((r) => r.locator?.text),
  );
  const links = o.interactiveElements.filter(
    (el) =>
      el.href &&
      !used.has(el.text) &&
      actionAllowed(
        { type: "click", elementId: el.id, reasoningSummary: "" },
        o,
        run,
      ),
  );
  const priority =
    g.id === "edge"
      ? /contact|feedback|form|search|help/i
      : g.id === "shopper"
        ? /product|pricing|shop|feature|service/i
        : /about|start|feature|help|docs/i;
  const next =
    links.find((e) => priority.test(e.text + " " + e.href)) || links[0];
  if (next)
    return {
      type: "click",
      elementId: next.id,
      reasoningSummary: `Explore the visible ${next.text || next.label || "navigation"} link and inspect the result.`,
    };
  return {
    type: "complete",
    outcome:
      "No further unvisited, permitted navigation is visible in this bounded session.",
    reasoningSummary:
      "The available navigation has been explored; remaining controls are outside this run’s permitted actions.",
  };
}
export async function websiteDecision(
  g: GhostState,
  o: Observation,
  run: RunState,
) {
  if (!hasModelCredentials())
    return {
      action: heuristicDecision(g, o, run),
      mode: "Heuristic exploration · no API key",
    };
  try {
    const result = await modelCall(
      z.object({ action: actionSchema }),
      "website_action",
      systemPrompt,
      {
        persona: g.persona,
        personality: g.personality,
        goal: g.goal,
        targetOrigin: new URL(run.target).origin,
        allowForms: run.allowForms,
        observation: o,
        history: g.actions,
        candidates: g.candidateIssues,
        remainingActions: 12 - g.actions.length,
      },
    );
    if (!actionAllowed(result.action, o, run))
      throw new Error("Decision referenced a blocked action.");
    return { action: result.action, mode: `${providerConfig().name} agent` };
  } catch {
    return {
      action: heuristicDecision(g, o, run),
      mode: "Heuristic fallback",
      notice:
        "AI decision failed validation or was unavailable after retry; this step uses visible navigation heuristics.",
    };
  }
}
export async function planGoals(
  run: RunState,
  observation: Observation,
): Promise<string[]> {
  const defaults = [
    "Understand the product and verify obvious navigation and onboarding affordances.",
    "Explore the primary product workflow, search, and navigation; compare state changes with UI promises.",
    "Inspect reasonable boundary conditions, required inputs, and visible errors within permitted actions.",
  ];
  if (!hasModelCredentials())
    return defaults.map((g) =>
      run.userGoal ? `${g} User objective: ${run.userGoal}` : g,
    );
  try {
    const plan = await modelCall(
      z.object({ goals: z.array(z.string().max(600)).length(3) }),
      "ghost_goals",
      `${systemPrompt} Plan exactly three distinct, achievable QA goals tailored to this website, in order: first-time user, fast workflow user, edge-case explorer. This is planning only; never claim a bug exists.`,
      { observation, userGoal: run.userGoal, allowForms: run.allowForms },
    );
    return plan.goals;
  } catch {
    run.gaps.push("AI goal planning failed; generic persona goals were used.");
    return defaults;
  }
}
