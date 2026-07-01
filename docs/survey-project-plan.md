Here is the **full updated content** of `survey-project-plan.md`:

```markdown
# Oze Survey Platform - Project Plan

**Project Name:** Oze Survey Platform (Reusable Survey System)  
**Initial Survey:** Australian Currency Knowledge Survey ("Money in Your Wallet")  
**Domain Structure:**  
- Main: https://survey.oze.au  
- This survey: https://survey.oze.au/money  

**Date:** 1 July 2026  
**Author:** Colin Dixon  
**Tech:** Pure HTML + Vanilla JS + CSS (self-contained, OzeGlass V2.0 Aurora style)  
**Goal:** Create a beautiful, reusable, embeddable survey engine following the oze.au Playbook.

## Objectives
1. Build a flexible survey system that works on any site (including Qortal).
2. Launch the Australian Currency Knowledge survey first.
3. Design so new surveys can be added quickly (duplicate template + edit data).
4. Support standard question types + special drag-and-drop for currency theme.
5. Make it visually beautiful (OzeGlass style) — far better than Google Forms.
6. Prepare for future analytics.

## Core Agenda (per user)
- Test how well Australians know their history through the people and features on our banknotes.
- Highlight balance: 4 men (including 1 Aboriginal — David Unaipon), 4 women, + Queen Elizabeth II.
- Note the current $5 note redesign (removing monarch, no King Charles).
- Collect demographics: Age group + Gender.
- Fully anonymous.
- Attempt one entry per person (localStorage + optional phone last-4 check).
- At end: Show personal score + current aggregate statistics.

## Core Features
### Question Types
- Multiple choice (single)
- Checkboxes
- Rating bars
- Text input
- Drag-and-drop matching (colour blocks to notes, people to notes)
- Image-based questions

### User Experience
- Demographics at start
- Progress bar + navigation
- Beautiful OzeGlass design, mobile-first
- Results page: personal score + explanations + current stats + shareable card
- Anonymous + one-entry attempt

### Technical Requirements (Playbook Compliant)
- Single HTML file initially (embedded CSS/JS)
- Vanilla JS only
- OzeGlass V2.0 Aurora styling
- Version headers + ready for bump-version.sh
- Works offline
- Export results as JSON

## Folder Structure (Proposed)
```
survey.oze.au/
├── index.html              # Survey list / landing
├── money/
│   ├── index.html          # Currency survey
│   ├── survey-data.js      # Questions + correct answers + facts
│   ├── styles.css
│   └── results.html (or modal)
├── assets/
│   └── images/             # banknotes, portraits, colour blocks
├── template/               # Reusable survey template
└── README.md
```

## Phase 1 - Currency Survey (MVP)
Use the original questions + improvements:
- Phase 1: Basics (denominations, colours)
- Phase 2: Historical figures (with drag & drop)
- Phase 3: $5 note cultural debate (slightly pointed tone)
- Add demographics (age + gender)

## Next Steps for Grok Build
1. Create core survey engine (beautiful single HTML file)
2. Implement all question types, especially drag-and-drop
3. Populate with full currency survey data + facts
4. Add scoring, results page with stats, anonymity features
5. Apply OzeGlass styling
6. Test on survey.oze.au/money
7. Create reusable template

**Success Criteria:**
- Beautiful, engaging UI
- Drag-and-drop works on mobile + desktop
- Clear results with personal score + aggregate stats
- Easy to duplicate for future surveys

---

**Instructions for Grok Build:**
Start with Phase 1. Create a clean, well-commented single HTML file first (with embedded CSS/JS and OzeGlass styling) for the currency survey.

Let's begin.
```

---

You can now copy this entire block and save it as `survey-project-plan.md` in your local `~/web/grok/` folder.  

Ready for the next step? (e.g. “Start building the HTML” or any tweaks)