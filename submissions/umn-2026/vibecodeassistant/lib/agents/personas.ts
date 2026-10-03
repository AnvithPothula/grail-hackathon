import type { GhostState } from "@/lib/types";
export function createGhosts(): GhostState[] {
  return [
    {
      id: "first",
      persona: "First-Time User",
      personality:
        "Unfamiliar with the interface; follows obvious navigation. Try a simple password first and compare the outcome with the stated requirements.",
      goal: "Create an account and reach the welcome dashboard.",
    },
    {
      id: "shopper",
      persona: "Impatient Shopper",
      personality:
        "Moves quickly and changes their mind midway. Add two different products, remove one, and check the visible arithmetic before checking out.",
      goal: "Add products, modify the cart, and complete checkout.",
    },
    {
      id: "edge",
      persona: "Edge-Case Explorer",
      personality:
        "Tries unusual but reasonable inputs. Probe required fields with empty input and compare the result with the UI claims.",
      goal: "Find form validation or state-management problems.",
    },
  ].map((g) => ({
    ...g,
    status: "idle",
    currentUrl: "",
    observations: [],
    actions: [],
    candidateIssues: [],
    currentObservation: "Waiting to enter the target.",
    lastAction: "Awaiting deployment",
    progress: 0,
    mode: "",
  }));
}
