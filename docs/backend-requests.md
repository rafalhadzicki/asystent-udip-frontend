# Requests for the backend

## `GET /api/cases`: filter by deadline, not only by receipt year

**Problem.** The `year` parameter filters by the year the case was received.
The calendar needs cases by deadline (`effectiveDueAt`), and a case received in
December can have its deadline in January or later (extended deadlines, kwerenda,
reach even further).

**What the frontend does now.** `useGetCasesOfYears` fetches two receipt years
(the displayed year and the previous one) with `sort=DEADLINE_ASC`, `limit=500`,
and filters by `effectiveDueAt` in the browser. Known gaps:

- a case received two or more years earlier never shows up;
- a year with more than 500 cases is cut off (the calendar shows a warning);
- every month change downloads whole years instead of one month.

**Requested change** (any one of these is enough):

- `GET /api/cases?dueFrom=YYYY-MM-DD&dueTo=YYYY-MM-DD` filtering by the
  effective deadline (`extendedDueAt ?? dueAt`), usable without `year`; or
- a dedicated `GET /api/cases/calendar?from=...&to=...` returning the same
  `CaseSummaryDto` items.

Cases already answered (`RESPONSE_SENT`) should stay in the result, the calendar
can hide them itself.

Once this exists, `useGetCasesOfYears` can be replaced with one query per
displayed month and the "partial results" warning removed.
