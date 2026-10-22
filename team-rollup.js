/* Illustrative data only; follows the submission rollup rule in forecast/cells.ts. */
(() => {
  const children = { morgan: ["dana", "casey"], dana: ["alice", "bob"] };
  const names = {
    morgan: "Morgan",
    dana: "Dana",
    alice: "Alice",
    bob: "Bob",
    casey: "Casey",
  };
  const seed = () => ({
    step: 0,
    events: [
      {
        id: "team-1",
        participantId: "alice",
        scope: "personal",
        value: 140000,
      },
      { id: "team-2", participantId: "bob", scope: "personal", value: 100000 },
      { id: "team-3", participantId: "dana", scope: "personal", value: 40000 },
      { id: "team-4", participantId: "casey", scope: "personal", value: 80000 },
    ],
    pending: 220000,
    freshId: null,
    changedTeams: [],
  });
  let state = seed();
  const latest = (person, scope) =>
    state.events.findLast(
      (e) => e.participantId === person && e.scope === scope,
    );
  function effective(person) {
    const reports = children[person];
    if (!reports) return latest(person, "personal")?.value ?? null;
    return (
      latest(person, "team")?.value ??
      reports.reduce((sum, child) => sum + (effective(child) ?? 0), 0)
    );
  }
  const rollup = (person) =>
    children[person].reduce((sum, child) => sum + (effective(child) ?? 0), 0);
  const descriptions = [
    [
      "Start with the reps’ forecasts",
      "Dana manages Alice and Bob. Morgan manages Dana and Casey. Nobody has submitted a team override, so team forecasts are calculated from direct reports.",
      [
        "Dana’s team = Alice + Bob.",
        "Morgan’s team = Dana’s team + Casey.",
        "Dana’s personal forecast is separate from her team forecast.",
      ],
    ],
    [
      "Dana makes a team call",
      "Dana has submitted her judgment for the whole team. It becomes the team value used by Morgan, while Alice and Bob keep their own submissions.",
      [
        "Dana’s team submission overrides the calculated report total.",
        "The override is a total, not an amount added on top.",
        "No rep submission was rewritten.",
      ],
    ],
    [
      "Alice changes her forecast",
      "Alice’s latest personal submission changes. The sum of Dana’s reports changes too, but Dana’s explicit team call remains in effect.",
      [
        "The rep detail shows Alice’s new amount.",
        "Dana’s submitted team amount still determines her contribution to Morgan.",
        "The manager can compare the report total with her own team call.",
      ],
    ],
    [
      "Dana also has a personal forecast",
      "Dana’s personal submission is for her own forecast. Under the proposed rule, it is not automatically added to the forecast of the team she manages.",
      [
        "Dana’s personal and team submissions have different scopes.",
        "Her personal edit does not change either team total.",
        "A submitted team call is the full amount Dana wants to report upward.",
      ],
    ],
    [
      "Clear the override to return to the rollup",
      "Clearing Dana’s team amount records a new event with a null value. The team forecast now falls back to the sum of her reports, and Morgan’s total recalculates.",
      [
        "The original override remains in history.",
        "The current view contains the cleared team event.",
        "Calculated rollups are read results, not new submission rows.",
      ],
    ],
  ];
  const actionLabels = [
    "Submit Dana’s team forecast",
    "Submit Alice’s revised personal forecast",
    "Submit Dana’s revised personal forecast",
    "Clear Dana’s team override",
    "Restart team walkthrough",
  ];
  function render({ $, money, table, record }) {
    const s = state;
    const [title, description, changes] = descriptions[s.step];
    $("progress").innerHTML = descriptions
      .map(
        (_, i) =>
          '<span class="dot ' + (i <= s.step ? "done" : "") + '"></span>',
      )
      .join("");
    $("step-label").textContent =
      "Step " + (s.step + 1) + " of " + descriptions.length;
    $("lesson-title").textContent = title;
    $("explanation").textContent = description;
    $("changes").innerHTML = changes.map((t) => "<li>" + t + "</li>").join("");
    $("error").textContent = "";
    $("board-title").textContent = "Team Commit · Q4 2026";
    $("clock").textContent = "Same column and period";
    const override = latest("dana", "team")?.value;
    const basis =
      override == null ? "sum of reports" : "submitted team override";
    const people = [
      ["morgan", "Morgan · VP"],
      ["dana", "↳ Dana · manager"],
      ["alice", "　↳ Alice · rep"],
      ["bob", "　↳ Bob · rep"],
      ["casey", "↳ Casey · rep"],
    ];
    $("board").innerHTML =
      table(
        ["Reporting hierarchy", "Personal", "Team forecast"],
        people.map(([id, label]) => ({
          fresh:
            s.changedTeams.includes(id) ||
            latest(id, "personal")?.id === s.freshId,
          cells: [
            label,
            money(latest(id, "personal")?.value),
            children[id]
              ? "<strong>" + money(effective(id)) + "</strong>"
              : "—",
          ],
        })),
      ) +
      '<p class="muted">Dana’s reports: ' +
      money(rollup("dana")) +
      ". Dana reports upward: " +
      money(effective("dana")) +
      " (" +
      basis +
      ").</p>" +
      '<p class="muted">Morgan: Dana ' +
      money(effective("dana")) +
      " + Casey " +
      money(effective("casey")) +
      " = <strong>" +
      money(effective("morgan")) +
      "</strong>.</p>";
    $("amount-label").firstChild.textContent = [
      "Dana’s team forecast ($)",
      "Alice’s personal forecast ($)",
      "Dana’s personal forecast ($)",
      "Clear team amount to restore calculated rollup",
      "Walkthrough complete",
    ][s.step];
    $("amount").disabled = s.step >= 3;
    $("amount").value = s.step >= 3 ? "" : s.pending;
    $("action").textContent = actionLabels[s.step];
    $("flow").textContent =
      "Alice + Bob → Dana’s team (override or rollup) → Morgan adds Dana’s team + Casey";
    $("records").className = "records";
    const cells = (e) => [
      names[e.participantId],
      e.scope,
      e.value == null ? "NULL · cleared" : money(e.value),
    ];
    const current = s.events.filter(
      (e, i, all) =>
        !all
          .slice(i + 1)
          .some(
            (next) =>
              next.participantId === e.participantId && next.scope === e.scope,
          ),
    );
    $("records").innerHTML =
      record(
        "ForecastSubmissionHistories",
        "Each personal or team edit appends an event. Seeded with four personal submissions.",
        s.events.length + " events",
        !!s.freshId,
        ["participantId*", "scope", "value"],
        s.events.map((e) => ({ fresh: e.id === s.freshId, cells: cells(e) })),
      ) +
      record(
        "ForecastSubmissions · VIEW",
        "Latest event per participant and scope for this column and period. No computed team rows are inserted.",
        current.length + " current rows",
        !!s.freshId,
        ["participantId*", "scope", "value"],
        current.map((e) => ({ fresh: e.id === s.freshId, cells: cells(e) })),
      ) +
      record(
        "Team calculation · READ RESULT",
        "Computed from current submissions and native reporting hierarchy. This is not an additional table.",
        "Calculated, not stored",
        s.changedTeams.length > 0,
        ["Manager", "Report total", "Used upward"],
        ["dana", "morgan"].map((id) => ({
          fresh: s.changedTeams.includes(id),
          cells: [names[id], money(rollup(id)), money(effective(id))],
        })),
      );
    $("takeaway").textContent =
      "At each manager: use the submitted team amount when present; otherwise sum direct reports’ effective forecasts. Never count both the manager’s team amount and its reps again. *Participant names stand in for IDs here.";
  }
  function act({ readAmount }) {
    if (state.step === 4) {
      state = seed();
      return;
    }
    const value = state.step === 3 ? null : readAmount();
    if (state.step !== 3 && value === null) return;
    const before = { dana: effective("dana"), morgan: effective("morgan") };
    const [participantId, scope] = [
      ["dana", "team"],
      ["alice", "personal"],
      ["dana", "personal"],
      ["dana", "team"],
    ][state.step];
    const id = "team-" + (state.events.length + 1);
    state.events.push({ id, participantId, scope, value });
    state.freshId = id;
    state.changedTeams = ["dana", "morgan"].filter(
      (person) => before[person] !== effective(person),
    );
    state.step++;
    state.pending = state.step === 1 ? 160000 : 50000;
  }
  window.TeamRollupWalkthrough = {
    render,
    act,
    reset() {
      state = seed();
    },
  };
})();
