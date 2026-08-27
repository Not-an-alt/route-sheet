# Route sheet — project rules

Trip planner, 10 Sept – 13 Nov 2026: Norway, the Alps, Spain. Three routing versions.
`index.html` is the app; `plan.json` is the content.

---

## How to read this file

There are two kinds of statement here and they behave differently.

**FACTS** are external and dated. Refuge closing dates, camping law, ferry seasons. They do not
change because the user changed their mind. They *do* go stale — each carries a date. If you are
working after that date, re-verify before relying on it.

**DECISIONS** are the user's choices, each with the reason it was made and what it traded away.
**Every decision here is revisable.** When the user wants to change one:

1. State the consequence **once**, plainly, in a sentence or two.
2. Then do it.
3. Update this file — move the old decision to the log at the bottom with the date and reason.

Do not refuse a decision change. Do not re-argue a point the user has already heard. Do not treat
this file as authority over the person reading it. A stale rule enforced against its author is
worse than no rule.

If a change breaks a FACT rather than a decision — booking a shut refuge, camping where it is
illegal — say so, because that is information, not preference. Then let them decide.

---

## Repo shape

| File | What it is | Changes |
|---|---|---|
| `index.html` | The app — UI, maps, storage, merge logic. Self-contained. | Rarely |
| `plan.json` | All trip content: three versions plus the detour catalogue. | Often |
| `sw.js` | Service worker: offline shell + tile cache. Bump `CACHE_V` when touched. | Rarely |
| `manifest.json` | PWA manifest. | Almost never |

Edit `plan.json` for anything about the trip. Bump its top-level `build` every time — the app
compares that string to what the browser stored and shows a merge banner. Forget it and the user
silently sees stale content. Bump `BUILD` in `index.html` (`YYYY-MM-DD-x`) when you change the app.

---

## FACTS (verify if working after the date given)

*As checked August 2026. Seasonal dates recur annually but shift — re-check each year.*

- **TMB refuges** close around 20 September. By early October huts are shut, lifts and shuttle
  buses stopped, snow settling above 2,000 m.
- **Camping on the TMB.** Italy bans bivouac below 2,500 m — nearly the whole Italian section.
  Switzerland bans it with narrow exceptions above the tree line. Chamonix has banned camping
  outside designated sites since 1992; Saint-Gervais bans it commune-wide. Chamoniarde cites a
  EUR 566 fine.
- **Camping des Glaciers, La Fouly** closes 4 October. Champex and Relais d'Arpette follow the
  same seasonal pattern. Bovernier and Martigny-Combe have no campsite at all.
- **Trolltunga shuttles, two seasons.** Odda–P2 Skjeggedal runs to 30 September, NOK 230–250
  return. P2–P3 Magelitopp runs only to 15 September, NOK 130 up / 100 down.
- **Skydive Voss** runs tandems April to September. Student discount Monday–Friday only.
- **Skydive Bovec** runs 15 March – 31 October, mostly Friday to Sunday.
- **Folgefonna Blue Ice Hike** runs late May to November, but the packaged trip from Bergen only
  operates 22 June – 9 August.
- **Samaria Gorge** closes late October, rain depending.
- **Fred Olsen, Los Cristianos–El Hierro**, 2h20, drops to about 5 crossings a week Oct–May.
- **Bodo is the end of the Norwegian rail network.** Nothing runs further north on that side.
- **Oslo–Copenhagen** needs no reservation on either leg. **Copenhagen–Hamburg** only requires one
  26 June – 31 August.
- **Clocks go back 25 October.** Dark by 17:30 for the last TMB days.
- **El Hierro diving** requires certification, dive insurance and a signed BOE medical
  questionnaire.
- **Dolomites**: Tre Cime and Seceda both depend on seasonal road and lift access. Flag it,
  do not assume it.

---

## DECISIONS (all revisable — reason and trade-off given)

| Decision | Why | What it costs |
|---|---|---|
| Norway 10–30 Sept, fixed | Residence permit: police verification 9 Sept, card must be collected | Not really a choice while the permit is pending |
| 65 days, ending 13 Nov, all versions | Fixed end date | Adding a stop must take days from another |
| TMB 18–26 Oct in A and C | Every day later is worse for snow and daylight | Constrains everything before it |
| TMB 23–31 Oct in B | Consequence of three Amsterdam returns | Known cost of version B |
| Tent as emergency shelter, not the plan | The camping law above | Four paid beds, three winter rooms |
| Greek line dropped | Samaria's late-Oct cutoff conflicted with a mid-Oct TMB | Lost Crete and Kalymnos |
| Version C has no flights | User asked to avoid flying | Lost the Canaries; Cabo de Gata substitutes |
| Nov 12 buffer night, Los Cristianos (A) | A cancelled ferry would otherwise cost an international flight | One day |
| Ship alpine kit from Chamonix to Amsterdam | EU-to-EU, avoids customs | — |

If the user overrides any of these, that is normal. Log it below.

---

## Sourcing

The user checks figures and has caught fabricated ones.

- **Never invent a price, distance, opening time or phone number.** Write `unpriced` or
  `unverified` and say where to check.
- Costs already in `plan.json` are sourced. Replace only with something better sourced.
- Three detours carry `verified: false` — Soca/Narnia, Strada della Forra, Cortina. Keep the flag
  until verified.
- Operator sites over aggregators. Aggregator quotes for the Bergen–Odda bus ranged threefold,
  which is why that cost reads "disputed".

## Style

Terse. No filler, no restating what a table already says. No citation markup in user-facing text.
Metric. Dates as `Sat 18 Oct`.

---

## Data model (`plan.json`)

```
{ build, generated, versions: { A, B, C }, detours: [...] }
```

Each version: `tripStart`, `tripEnd`, `segments[]`, `bookings[]`, `kit[]`, `pre[]`, `reminders[]`.

- `segments[]` — `{id, place, tag, nights, transport, stay, notes, items[], lat?, lon?}`.
  `tag` is one of `trek adv dive city transit rest`. **Dates are derived** from `tripStart` plus
  cumulative `nights`; nothing stores a date, so reordering just works.
- `bookings[]` — `{id, group, what, deadline, status}`. Groups: `Tour du Mont Blanc`, `Flights`,
  `Rail & ferry`, `Stays`, `Activities`, `Admin`. Status: `todo` `ask` `done`.
- `detours[]` — optional places not in the route. `anchors[]` names stops it can follow; if none
  exist in a version, insertion is disabled there.

`segments[].place` is a lookup key for built-in coordinates, activity pins and hand-written detail
pages. **Renaming a place loses its map pins, its detail page, and the user's ticked boxes.** If a
rename is genuinely needed, update `CO`, `POI` and `DET` in `index.html` to match and say so.

---

## Checklist for any itinerary change

1. Edit `plan.json`; bump `build`.
2. Day total still 65? End date still 13 Nov?
3. Did the TMB start move? If so, was that intended?
4. Any booking, reminder or kit item now wrong? Fix in the same commit.
5. Say plainly what was traded. There is no slack, so something always is.

---

## Open questions — ask, do not assume

- Is the Eurail pass continuous or flexi? Version C burns many travel days; the answer decides
  whether C is cheap.
- Does the trip end in Amsterdam, or return to Norway after?
- Is there a budget ceiling? "Save money" was raised but never quantified.

---

## Decision log

Append here when a decision above changes. Newest first.

- *2026-08-25 — file created from the planning conversation.*
