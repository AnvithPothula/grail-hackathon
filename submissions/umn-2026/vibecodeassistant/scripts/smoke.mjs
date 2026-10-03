import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3000";
const response = await fetch(base + "/api/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target: base + "/demo",
    watch: process.env.WATCH_GHOSTS === "true",
  }),
});
assert.equal(response.status, 200, await response.clone().text());
let run = await response.json();
const deadline = Date.now() + 300000;
while (run.status === "running" && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 1000));
  run = await (await fetch(base + "/api/run?id=" + run.id)).json();
}
assert.equal(run.status, "complete", JSON.stringify(run));
const expected = process.env.SINGLE_GHOST ? 1 : 3;
assert.equal(
  run.bugs.length,
  expected,
  JSON.stringify(
    run.ghosts.map((g) => ({ id: g.id, error: g.error, actions: g.actions })),
  ),
);
for (const bug of run.bugs) {
  assert.equal(bug.reproduced, true);
  assert.ok(bug.stepsToReproduce.length > 2);
  assert.ok(bug.executionLog.some((e) => e.phase === "REPRODUCTION"));
  assert.ok(bug.executionLog.some((e) => e.phase === "VERIFY"));
}
console.log(
  JSON.stringify(
    {
      status: run.status,
      bugs: run.bugs.map((b) => ({ title: b.title, reproduced: b.reproduced })),
      actions: run.ghosts.map((g) => ({
        ghost: g.persona,
        count: g.actions.length,
      })),
    },
    null,
    2,
  ),
);
