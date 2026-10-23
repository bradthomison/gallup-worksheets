# Strengths Interplay report: sketch

A new built-in report for one person's Top 5: how the five strengths work *together*. It borrows the idea behind the "Gallup DNA" site (AI-written interactions and blind spots) but fits how your app already works: your own text as the source, a coach in the loop, and results stored and reusable.

## What the participant sees

One page (and PDF) per person, in the same style as Personal Insights:

1. **Headline**: one line capturing the combination.
2. **Overview**: 2–3 sentences.
3. **Domain balance**: counts across Executing / Influencing / Relationship Building / Strategic Thinking. *Computed in code from your existing strength→domain table, not by the AI.*
4. **Synergies**: the 4–5 strongest pairs out of the 10 possible, each with "what it does" and "how it shows up at work".
5. **Tensions**: 2–3 pairs that can pull against each other, each with a practical tip.
6. **At your best / Under pressure.**
7. **Blind spots** (3) and **Who to lean on** (what to look for in partners).
8. **Reflection questions** (3), for use in a coaching conversation.

Illustrative only (hand-written, not system output), for Activator · Includer · Ideation · Positivity · Strategic:
- *Headline:* "You start things, bring people in, and keep the energy up."
- *Synergy, Activator + Includer:* momentum with a wide circle, so ideas get tested on more people sooner. *Tension, Activator + Strategic:* acting now versus mapping the options first.

Optional modules, off by default: **career/role ideas** (roles where the combination tends to thrive) and **famous examples**. Famous matches are the weak point of the site we looked at: Gallup doesn't publish celebrities' strengths, so a model can only guess. If you want them, use a short curated list of people who have publicly shared their top five, written by you.

## How it is built from your own content

For each of the five strengths the generator receives your existing text (description, descriptive words, role, value I bring, needs, motivators, demotivators, plus Bring/Need), including any edits you made. The prompt tells the model to build every statement from that text and to name the strengths each statement relies on. The reply must follow a fixed JSON shape, which the app turns into the page, so the layout never depends on free-form writing.

**What is sent out:** only the five strength names and your standard text. No name, email, team or organization. That keeps participants' identities away from the AI provider. Worth a quick check with KUMC compliance before launch.

## Coach review before anyone sees it

This is the main difference from the other site and the part that fits you:

`draft → coach edits → approved`

- A coach generates a draft from the Participants page (one person, or bulk for a selection), reads and edits it, then approves it.
- Participants only ever see **approved** reports, labelled "AI-assisted draft, reviewed by your coach."
- Edits are kept, so regenerating never silently overwrites them. You choose to replace.
- Generation happens when a coach clicks, never when a participant opens a page. So no surprise costs and no participant ever meets a failed AI call (the likely reason the other site's analysis didn't work for you).

## Where it shows up

| Place | Change |
|---|---|
| Reports page | New built-in "Strengths Interplay" card: shared house-style instructions (tone, length, optional modules), plus sample output for a combination you pick. |
| Participants → Reports panel | New row with status chip (None / Draft / Approved) and Generate / Review / Download PDF / Copy link / Send link. Bulk generate for selected people. |
| Participant home (`/me`) | Appears once approved. |
| New Session / team portal | Selectable like the other built-in reports. |
| PDF | One-page landscape builder alongside the existing ones. |

Later: a **team version** (how the whole team's strengths interact), which fits "Team Strengths Overview".

## Behind the scenes

- **Storage:** one new table, `interplay_reports`: person, the Top 5 as it was at generation, the content (JSON), status, who edited, model and prompt version, and a hash of the source text. If you edit a strength's text or change the prompt, existing reports are flagged "out of date" rather than changed.
- **Caching:** identical Top 5 (in order) with identical source text reuse the stored result, so a combination is paid for once. There are 33 million ordered combinations, but you have about 240 people, so the real number of generations is small.
- **Where the code runs:** start as a Supabase edge function, like your other seven (fastest path with today's stack). Written so it moves cleanly to a Cloudflare Worker and D1 during the migration. The API key is a server secret and never reaches the browser.
- **Model and cost:** a current Claude Sonnet-class model. Each report is a few thousand words in and out, which should be cents per report, so low single-digit dollars for everyone you have today. Estimate only; check current pricing.
- **Quality control:** run ~10 hand-picked combinations first and read them closely; keep a prompt version so improvements can be re-run in bulk.

## Build order

1. **MVP:** table, generator, coach generate/review/approve on the Participants page, participant view, PDF.
2. **Polish:** bulk generate, out-of-date flags, Reports page card with house style and sample, session and team-portal options.
3. **Extras:** career/role module, curated "notable people", team interplay.

## Decisions for you

- Should participants see it only after approval (recommended), or is auto-publish OK for some groups?
- Include career/role ideas in v1?
- Keep famous examples out, or curate a short list yourself?
- OK to send only strength names and standard text to the AI provider, after a quick KUMC compliance check?
