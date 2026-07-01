# Survey Layout Lessons — Money in Your Wallet (v1.0.3)

Notes for the next survey. Distilled from building the first `survey.oze.au` MVP.

## Do

### Multiple choice & demographics
- **Always use a grid** for radio/checkbox options — never a single long column on mobile.
- **Demographics (age + gender):** separate labelled grids. Age: 2 cols mobile, 4 cols desktop. Gender: 2×2.
- **4–6 options:** `grid: 2` (2 columns). **6+ options:** `grid: 2, gridCols: 3` (3 columns on wider screens).
- **Checkboxes:** use `change` events on `<input>`, not `click` + manual toggle — label clicks double-toggle otherwise.
- Set `grid: true` on any single-choice question with 4+ short options.

### Drag-and-drop — colours
- **Fixed-size swatches** (48×32px). Never `width: 100%` on colour blocks — they blow up to full screen.
- **Only real denominations** in the drop grid ($5–$100). Decoy notes ($25, $200) belong in the *checkbox* question only, not drag UI.
- **Layout:** compact swatch row **above** a 5-column note grid. Max-width ~400px, centred.
- **Shuffle** pool order once per session (`poolOrder` in answers state).
- Note cards: **short height** (~40px), not banknote aspect-ratio — saves vertical space.
- Hint: tap swatch → tap note; tap filled note to return colour.

### Drag-and-drop — people
- **5-column note grid** ($5 → $100), no decoys.
- **Pool:** 3-column grid with name + short description while unplaced.
- **Placed chips:** name only — hide `.chip-sub` after drop (`person-chip--placed`).
- People zones: compact vertical stack (badge + chips), not horizontal rows.

### General
- One question per glass card; progress bar sticky top.
- Touch targets ≥ 44px on option rows; drag items can be smaller if tap-to-place fallback exists.
- Test at **375px** width before shipping.

## Don't

| Mistake | Why it failed |
|--------|----------------|
| `width: 100%` colour swatches | Filled entire screen in flex/grid parents |
| 7-column grid with $25/$200 decoys | Cluttered drag UI; decoys confused users |
| Text labels on colour swatches ("Pink", "Blue") | Gave away answers; user wanted pure colour |
| `click` + `inp.checked = !inp.checked` on checkboxes | Label native toggle + handler = no visible change |
| Full aspect-ratio note cards in drag zones | Too tall; pushed content below fold |
| Descriptions on placed person chips | Messy, wasted space in drop zones |
| Percentage-based community stats from `0.62` decimals | Looked wrong; use `correct/total` counts |

## Question-type cheat sheet

| Type | Layout flag | CSS class |
|------|-------------|-----------|
| Checkbox | default | `.options-multi` |
| Single, 4 opts | `grid: 2` | `.options-grid-2` |
| Single, 6 opts | `grid: 2, gridCols: 3` | `.options-grid-2.cols-3` |
| Demographics | `type: demographics` | `.demo-field--age` / `--gender` |
| Colour drag | `type: drag-colours` | `.colour-match-wrap` |
| People drag | `type: drag-people` | `.dnd-people-pool` + `.dnd-people-grid` |

## Duplicating for survey #2

1. Copy `money/index.html` → `your-survey/index.html`
2. Edit `SURVEY_DATA` only; keep engine + CSS patterns above
3. For new drag types, start from colour/people templates — don't invent new grid logic per survey
4. Run `./bump-version.sh X.Y.Z` before commit
5. Read this file again before designing new question layouts

## Repo

https://github.com/coldix/survey-oze-au