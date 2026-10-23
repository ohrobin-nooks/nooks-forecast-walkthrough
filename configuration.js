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
    const id = (value, kind) =>
      `<code class="record-id ${kind}">${value}</code>`;
    const boardFilterFor = (boardId) =>
      boardId === "company"
        ? "[] · no additional restriction"
        : `segment = Enterprise${state.step >= 2 ? " AND type = New business" : ""}`;
    const columnFilterFor = (columnId) =>
      state.step >= 3 && columnId === "ent-main"
        ? "owner = Alice"
        : "[] · no additional restriction";
    $("records").className = "records configuration";
    // Keep all six example records visible. The column is the link between a
    // board and a reusable metric; config.metricId is not a Postgres FK.
    $("records").innerHTML =
      `
      <article class="card relationship-map">
        <h2>Start with the column: it points to both records</h2>
        <p>A board is a saved page. A column is one configured column on that page. A metric is a reusable calculation that a metric column points to.</p>
        <div class="scroll"><div class="relationship-path">
          <div class="relationship-node"><strong>ForecastBoards</strong><br>id = ${id(selected.boardId, "board-id")}<br>${selected.board}</div>
          <div class="relationship-link"><span>boardId</span><b>←</b><small>Database foreign key*</small></div>
          <div class="relationship-node"><strong>ForecastColumns</strong><br>id = ${id(selected.id, "column-id")}<br>${selected.label}</div>
          <div class="relationship-link logical"><span>config.metricId</span><b>⇢</b><small>Reference inside JSON</small></div>
          <div class="relationship-node"><strong>ForecastMetrics</strong><br>id = ${id("metric-open", "metric-id")}<br>SUM(${amountProperty()})</div>
        </div></div>
        <p><strong>Read the matching IDs:</strong> column ${id(selected.id, "column-id")} has <code>boardId = ${selected.boardId}</code>, so it belongs to the ${selected.board} board. Its <code>config.metricId = metric-open</code> selects the shared calculation.</p>
        <p class="muted">*The database foreign key pairs (workspaceId, boardId) with ForecastBoards (workspaceId, id). config.metricId is stored inside JSON and resolved by the Nooks backend within the workspace; Postgres does not enforce it as a foreign key.</p>
        <p class="muted">Below are all six records, not just the selected ones. Every row has workspaceId = demo-workspace. These readable IDs stand in for UUIDs. Blue outlines trace the selected column’s links; purple shading marks the last edit.</p>
      </article>` +
      record(
        "ForecastBoards · 2 rows",
        "Each board exists once. A board does not store a metricId; its columns reference their metrics.",
        state.step === 2 ? "Enterprise filters updated" : "Board configuration",
        state.step === 2,
        ["id", "name", "config.filters"],
        [
          { id: "company", name: "Company" },
          { id: "enterprise", name: "Enterprise" },
        ].map((board) => ({
          fresh: state.step === 2 && board.id === "enterprise",
          cells: [
            id(board.id, "board-id"),
            board.name,
            boardFilterFor(board.id),
          ],
        })),
      ) +
      record(
        "ForecastColumns · 3 rows",
        "Two different columns belong to Enterprise because they repeat the same boardId. All three columns use the same metric because they repeat config.metricId.",
        state.step === 1 || state.step === 3
          ? "ent-main updated"
          : "One row per placement",
        state.step === 1 || state.step === 3,
        [
          "id",
          "boardId → Boards.id",
          "label",
          "position",
          "config.metricId → Metrics.id",
          "config.filters",
          "Trace links",
        ],
        placements.map((column) => ({
          fresh:
            (state.step === 1 || state.step === 3) && column.id === "ent-main",
          cells: [
            id(column.id, "column-id"),
            id(column.boardId, "board-id"),
            column.label,
            column.position,
            id("metric-open", "metric-id"),
            columnFilterFor(column.id),
            `<button class="inspect" data-record-inspect="${column.id}" aria-pressed="${column.id === state.selected}" aria-label="Trace ${column.id}">${column.id === state.selected ? "Selected" : "Trace"}</button>`,
          ],
        })),
      ) +
      record(
        "ForecastMetrics · 1 row",
        "The calculation is stored once. There is no boardId here: this metric can be referenced from multiple boards through their columns.",
        state.step === 4
          ? "Shared calculation updated"
          : "Referenced by all 3 columns",
        state.step === 4,
        [
          "id",
          "name",
          "definition.aggregation",
          "definition.amountProperty",
          "definition.filters",
        ],
        [
          {
            fresh: state.step === 4,
            cells: [
              id("metric-open", "metric-id"),
              "Open Pipeline",
              "SUM",
              amountProperty(),
              "is_closed is false",
            ],
          },
        ],
      );
    const recordCards = $("records").querySelectorAll(".record");
    const boardRow = selected.boardId === "company" ? 0 : 1;
    recordCards[0]
      .querySelectorAll("tbody tr")
      [boardRow].classList.add("linked-row");
    recordCards[1]
      .querySelectorAll("tbody tr")
      [placements.indexOf(selected)].classList.add("linked-row");
    recordCards[2].querySelector("tbody tr").classList.add("linked-row");
    $("records")
      .querySelectorAll("[data-record-inspect]")
      .forEach((button) => {
        button.onclick = () => {
          state.selected = button.dataset.recordInspect;
          render(helpers);
        };
      });
    $("takeaway").textContent =
      "Why three tables? The metric owns a reusable calculation. The board owns shared context. The column owns one placement and its extra restrictions. This avoids copying a calculation into every column, but a shared metric edit affects every reference. The six rows above store configuration; the dollar totals are computed read results. Field paths are exact; filter values above are readable summaries of stored configuration. Revision and audit updates are omitted.";
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
