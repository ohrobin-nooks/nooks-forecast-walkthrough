/* Synthetic teaching example of basic metrics: metric + board + column filters.
 * Mirrors forecast/service.ts and metrics.ts; it is not a production evaluator.
 */
(() => {
  const deals = [
    {
      name: "Acme",
      amount: 100000,
      annual_value: 80000,
      segment: "Enterprise",
      type: "New business",
      owner: "Alice",
      open: true,
    },
    {
      name: "Beacon",
      amount: 60000,
      annual_value: 40000,
      segment: "Enterprise",
      type: "Renewal",
      owner: "Alice",
      open: true,
    },
    {
      name: "Cedar",
      amount: 40000,
      annual_value: 30000,
      segment: "SMB",
      type: "New business",
      owner: "Bob",
      open: true,
    },
    {
      name: "Delta",
      amount: 90000,
      annual_value: 90000,
      segment: "Enterprise",
      type: "New business",
      owner: "Alice",
      open: false,
    },
    {
      name: "Echo",
      amount: 80000,
      annual_value: 50000,
      segment: "Enterprise",
      type: "New business",
      owner: "Bob",
      open: true,
    },
  ];
  const seed = () => ({ step: 0, selected: "ent-main", before: null });
  let state = seed();
  const columns = () => [
    {
      id: "company-main",
      boardId: "company",
      board: "Company",
      label: "Open Pipeline",
      position: 1,
    },
    {
      id: "ent-main",
      boardId: "enterprise",
      board: "Enterprise",
      label: state.step >= 1 ? "Team Pipeline" : "Pipeline",
      position: 1,
    },
    {
      id: "ent-check",
      boardId: "enterprise",
      board: "Enterprise",
      label: "Comparison",
      position: 2,
    },
  ];
  const amountProperty = () => (state.step >= 4 ? "annual_value" : "amount");
  const reasons = (deal, column) => {
    const excluded = [];
    if (!deal.open) excluded.push("Metric: deal is closed");
    if (column.boardId === "enterprise") {
      if (deal.segment !== "Enterprise") excluded.push("Board: segment is SMB");
      if (state.step >= 2 && deal.type !== "New business")
        excluded.push("Board: renewal excluded");
    }
    if (state.step >= 3 && column.id === "ent-main" && deal.owner !== "Alice")
      excluded.push("Column: owner is Bob");
    return excluded;
  };
  const matched = (column) =>
    deals.filter((deal) => !reasons(deal, column).length);
  const total = (column) =>
    matched(column).reduce((sum, deal) => sum + deal[amountProperty()], 0);
  const lessons = [
    [
      "One calculation, three places to display it",
      "An admin creates one Open Pipeline metric, then adds it to a Company board and twice to an Enterprise board. All three columns reference metric-open. The Comparison column makes the scope of each edit visible.",
      [
        "ForecastMetrics defines SUM(amount) for open deals.",
        "ForecastBoards restricts Enterprise to Enterprise deals.",
        "ForecastColumns stores each placement and its reference to metric-open. The metric record stores a definition, not a dollar result.",
      ],
      "Rename Enterprise’s Pipeline column",
    ],
    [
      "A column label changes one heading",
      "Pipeline is now Team Pipeline on the Enterprise board. Its column ID and metric reference stay the same, so every calculation returns the same amount.",
      [
        "Updated: ForecastColumns.label on ent-main.",
        "No metric or board configuration changed.",
        "Next, narrow the Enterprise board to new business. Watch both of its columns.",
      ],
      "Set Enterprise board to new business only",
    ],
    [
      "A board filter affects both of its columns",
      "Enterprise now requires segment = Enterprise AND type = New business. Both Enterprise columns lose Beacon’s renewal. Company still includes it because that board has no such restriction.",
      [
        "Updated: ForecastBoards.config.filters on enterprise.",
        "Enterprise’s two results fall from $240,000 to $180,000.",
        "Company stays at $280,000. Next, filter just Team Pipeline to Alice’s deals.",
      ],
      "Set Team Pipeline column to Alice only",
    ],
    [
      "A column filter narrows one use of the metric",
      "Team Pipeline now adds owner = Alice to the metric and board filters. Echo belongs to Bob, so only this column loses Echo’s $80,000. Comparison still includes both owners.",
      [
        "Updated: ForecastColumns.config.filters on ent-main.",
        "Team Pipeline becomes $100,000; Comparison stays $180,000.",
        "Next, change the shared metric to sum annual_value instead of amount. Both are existing fields in our sample CRM records.",
      ],
      "Change shared metric to sum annual value",
    ],
    [
      "A shared metric edit reaches every referencing column",
      "The admin changes the shared calculation from SUM(amount) to SUM(annual_value). The matching deals stay the same, but all three columns now sum a different field. Annual value is a synthetic CRM property here; no currency conversion is involved.",
      [
        "Updated: ForecastMetrics.definition.amountProperty on metric-open.",
        "Company becomes $200,000; Team Pipeline $80,000; Comparison $130,000.",
        "The column labels stay as configured. Shared metric edits need review across all usages; create a separate metric when only one usage should change.",
      ],
      "Restart configuration walkthrough",
    ],
  ];
  function render(helpers) {
    const { $, money, table, record } = helpers;
    const [title, explanation, changes, action] = lessons[state.step];
    const placements = columns();
    const selected = placements.find((column) => column.id === state.selected);
    $("progress").innerHTML = lessons
      .map(
        (_, i) => `<span class="dot ${i <= state.step ? "done" : ""}"></span>`,
      )
      .join("");
    $("step-label").textContent = `Step ${state.step + 1} of ${lessons.length}`;
    $("lesson-title").textContent = title;
    $("explanation").textContent = explanation;
    $("changes").innerHTML = changes.map((item) => `<li>${item}</li>`).join("");
    $("action").textContent = action;
    $("error").textContent = "";
    $("board-title").textContent = "Two boards · three metric columns";
    $("clock").textContent = "Q4 2026 · Alice + Bob";
    $("board").innerHTML =
      table(
        ["Board / column", "Calculated value", "Explore"],
        placements.map((column) => {
          const before = state.before?.[column.id];
          return {
            fresh:
              (before !== undefined && before !== total(column)) ||
              (state.step === 1 && column.id === "ent-main"),
            cells: [
              `${column.board}<br><strong>${column.label}</strong>`,
              `<span data-total="${column.id}" class="big">${money(total(column))}</span>${before !== undefined && before !== total(column) ? `<br><span class="muted">was ${money(before)}</span>` : ""}`,
              `<button class="inspect" data-inspect="${column.id}" aria-pressed="${column.id === state.selected}" aria-label="Inspect ${column.board} ${column.label}">${column.id === state.selected ? "Selected" : "Inspect"}</button>`,
            ],
          };
        }),
      ) +
      '<p class="muted">These are calculated metric cells. No forecast submission or snapshot is written by these configuration edits. Inspect a column to follow its calculation below.</p>';
    $("board")
      .querySelectorAll("[data-inspect]")
      .forEach((button) => {
        button.onclick = () => {
          state.selected = button.dataset.inspect;
          render(helpers);
        };
      });
    $("flow").textContent =
      "Column → references shared metric + belongs to board → combine filters → read existing CRM records → calculate value";
    const boardFilter =
      selected.boardId === "company"
        ? "No additional filter"
        : `segment = Enterprise${state.step >= 2 ? " AND type = New business" : ""}`;
    const columnFilter =
      state.step >= 3 && selected.id === "ent-main"
        ? "owner = Alice"
        : "No additional filter";
    const included = matched(selected);
    $("configuration-detail").innerHTML = `
      <h2>Follow the calculation: ${selected.board} / ${selected.label}</h2>
      <p class="muted">All five sample deals close in Q4 and belong to permitted owners Alice or Bob. Period and access scope are held constant. Filters below further restrict those records.</p>
      <div class="filter-flow">
        <div class="filter-node"><strong>1. Metric · metric-open</strong>Open deals<br>SUM(${amountProperty()})</div>
        <div class="filter-node"><strong>2. Board · ${selected.boardId}</strong>${boardFilter}</div>
        <div class="filter-node"><strong>3. Column · ${selected.id}</strong>${columnFilter}</div>
        <div class="filter-node"><strong>4. Read result</strong>${included.length} deal${included.length === 1 ? "" : "s"}<br><b>${money(total(selected))}</b></div>
      </div>
      <p>Each included deal must pass <strong>all three sets of filters</strong>. Empty board or column filters add no restrictions.</p>
      ${table(
        [
          "Existing deal",
          "Segment / type / owner",
          "fields.amount",
          "fields.annual_value",
          "Why included or excluded",
        ],
        deals.map((deal) => ({
          cells: [
            deal.name,
            `${deal.segment} · ${deal.type} · ${deal.owner}`,
            money(deal.amount),
            money(deal.annual_value),
            reasons(deal, selected).length
              ? reasons(deal, selected).join("; ")
              : `<strong>Included: +${money(deal[amountProperty()])}</strong>`,
          ],
        })),
      )}
      <p><strong>SUM:</strong> ${included.map((deal) => `${deal.name} ${money(deal[amountProperty()])}`).join(" + ")} = <strong>${money(total(selected))}</strong></p>`;
    const fieldRows = (entries, freshFields) =>
      entries.map(([field, value]) => ({
        fresh: freshFields.includes(field),
        cells: [`<code>${field}</code>`, value],
      }));
    const boardChanged = state.step === 2 && selected.boardId === "enterprise";
    const columnChanged =
      (state.step === 1 || state.step === 3) && selected.id === "ent-main";
    $("records").className = "records";
    $("records").innerHTML =
      record(
        "ForecastMetrics",
        "ONE shared definition. All three columns reference this ID.",
        state.step === 4 ? "Shared metric updated" : "1 shared metric",
        state.step === 4,
        ["Field", "Stored value"],
        fieldRows(
          [
            ["id", "metric-open"],
            ["name", "Open Pipeline"],
            ["kind", "basic"],
            ["definition.aggregation", "SUM"],
            ["definition.amountProperty", amountProperty()],
            ["definition.filters", "is_closed is false"],
          ],
          state.step === 4 ? ["definition.amountProperty"] : [],
        ),
      ) +
      record(
        "ForecastBoards",
        "Selected board. Its filters apply to both metric columns when viewing Enterprise.",
        boardChanged ? "Board filters updated" : "2 boards total",
        boardChanged,
        ["Field", "Stored value"],
        fieldRows(
          [
            ["id", selected.boardId],
            ["name", selected.board],
            ["config.filters", boardFilter],
            ["config.periodTypes", "QUARTER"],
          ],
          boardChanged ? ["config.filters"] : [],
        ),
      ) +
      record(
        "ForecastColumns",
        "Selected placement. Separate records allow independent labels, positions and additional filters.",
        columnChanged ? "Selected column updated" : "3 columns total",
        columnChanged,
        ["Field", "Stored value"],
        fieldRows(
          [
            ["id", selected.id],
            ["boardId", selected.boardId],
            ["label", selected.label],
            ["position", selected.position],
            ["kind", "metric"],
            ["config.metricId", "metric-open"],
            ["config.filters", columnFilter],
          ],
          columnChanged ? [state.step === 1 ? "label" : "config.filters"] : [],
        ),
      );
    $("records")
      .querySelectorAll(".record")
      .forEach((element) => element.classList.add("config-record"));
    $("takeaway").textContent =
      "Why three tables? The metric owns a reusable calculation. The board owns shared context. The column owns one placement and its extra restrictions. This avoids copying a calculation into every column, but a shared metric edit affects every reference. Field paths are exact; filter values above are readable summaries of stored configuration. Revision and audit updates are omitted.";
  }
  window.ConfigurationWalkthrough = {
    render,
    act() {
      if (state.step === lessons.length - 1) {
        state = seed();
        return;
      }
      state.before = Object.fromEntries(
        columns().map((column) => [column.id, total(column)]),
      );
      state.step++;
    },
    reset() {
      state = seed();
    },
  };
})();
