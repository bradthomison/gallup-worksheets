# Cutover plan: Vercel → mystrengthstraining.com

Goal: anyone who follows an old Vercel link ends up in the right place on `kumc.mystrengthstraining.com`, and everyone who can no longer *reach* Vercel (the KUMC network blocks it) gets new links.

Status as of 2026-10-23: the app already runs on Cloudflare at `kumc.mystrengthstraining.com` against the same Supabase database. Vercel (`gallup-worksheets.vercel.app`) is still the live site. Nothing below is switched on yet.

## 1. Two groups of people

| | Can load Vercel | Cannot load Vercel (KUMC network) |
|---|---|---|
| Follows an old link | **Redirect fixes it** | Blocked before any redirect can happen. **Needs a new link.** |
| What fixes it | `vercel.json` redirect (section 2) | Resend links + update Acorn + new QR codes (sections 3–5) |

The redirect helps phones, home networks and anyone off the KUMC network. The people you are actually worried about need new links.

## 2. Vercel redirects

**Rule (go-live version).** Replace the `redirects` block in `vercel.json` with:

```json
"redirects": [
  { "source": "/:path*", "destination": "https://kumc.mystrengthstraining.com/:path*", "permanent": false }
]
```

- Every path and query string carries over, so `/worksheet/<id>`, `/personal-insights?email=…`, `/team/<id>`, `/report/<id>`, `/lms/<id>`, `/session/<id>/join`, `/sign-in`, `/me` all land on the same page on the new site. Worksheet, team, topic and report IDs are unchanged, because both sites use the same database.
- Emailed sign-in links end with `#access_token=…`. Browsers keep that fragment across a redirect, so those still sign the person in (on the new site).
- It goes to `kumc.` because every record today belongs to KUMC. When a second organization exists, old links still go to KUMC; new organizations get their own links.
- **Temporary (307) first, permanent (308) later.** Browsers cache permanent redirects, which makes a rollback painful. Switch to permanent after a couple of quiet weeks.
- `gallup-strengths.vercel.app` is a *different* project ("Gallup DNA"). It is not affected.

**Side effects on go-live.**
- Anyone signed in on the Vercel site is signed out once (browser sign-ins are per address). Coaches sign in again at `kumc.mystrengthstraining.com/coach`.
- Coach bookmarks to the Vercel address forward to the new site automatically.

**Verification before go-live.** The committed `vercel.json` currently contains only a harmless test rule, `/__redirect-test/…`, which nobody uses. Once it is on Vercel I check that path and query string survive (`curl -I`). Then go-live is a one-line swap to the rule above.

**Rollback.** Revert the commit; Vercel redeploys the old config in about a minute. The Vercel project and Supabase data are untouched, so nothing is lost.

## 3. Resend plan (people who cannot reach Vercel)

There is no record of which emails were sent, so this plan assumes anyone with an open session may be holding an old link.

**Audience (from the database today):**

| Session | Date | Coach | People | Submitted | Suggestion |
|---|---|---|---|---|---|
| RCH Talent Map (Team Strengths Overview) | 2027-02-01 | tmorrow | 22 | 0 | Wait until closer to the date |
| Newman Reg. Hosp. Strengths & SL | 2026-11-18 | tmorrow | 29 | 0 | Resend |
| SWMC Leading Through Change | 2026-10-20 | bthomison | 54 | 0 | Resend if worksheets are still open |
| SWMC Motivation | 2026-10-20 | bthomison | 54 | 0 | Resend if worksheets are still open |
| Strengths Overview (Personal Insights) | 2026-09-25 | bthomison | 21 | 2 | Skip unless reports are still in use |
| Older sessions (Decision Making, Frontiers, Motivational Approaches, RHES…) | Apr–Sep | bthomison | 142 | 8 | Skip; covered by the announcement below |

248 distinct people have been in sessions; 239 are on teams with strengths on file.

**Step A. One announcement to everyone (≈239 people).** "We've moved. Your strengths page now lives at kumc.mystrengthstraining.com. Enter your email and we'll send you a sign-in link. Old links will stop working inside the KUMC network." Everything a person needs hangs off their personal page (`/me`), so this single email replaces most individual resends.

**Step B. Resend worksheet links for sessions still in use** (Newman and SWMC above). Open each session at `kumc.mystrengthstraining.com`, choose **Send Links** and pick the recipients (everyone, or just the ones who haven't started). Links are built from the address you are viewing, so they come out as new-site links automatically. Sessions that use Personal Insights, Power of 2, Power of Me or Team Overview open the right page after the person's link loads.

**Step C. Individual report links (Send Link on the Participants page).** Not tracked, so not resent one by one. People reach those reports from their personal page after Step A.

**Cautions.**
- Check your Resend plan's daily sending cap before sending ~250+ emails in one day; spread the sends over days if needed. (Cloudflare Email Service can take over later.)
- KUMC may rewrite or scan links in incoming mail; send one test to your own `@kumc.edu` address first.
- Suggested follow-up feature: record `links_sent_at` on participants so the next migration doesn't have to guess.

## 4. Acorn LMS links (update by hand)

These are the "Acorn Course Link" URLs shown on the Session Topics and Reports pages. Anything pasted into Acorn today points at Vercel and is blocked for KUMC users. The new addresses already work, so **this can be done before go-live**.

| Item | New link |
|---|---|
| Creating A New Team | https://kumc.mystrengthstraining.com/lms/6580a833-b1cc-4bf0-a0fa-35f6df6e0b19 |
| Decision Making | https://kumc.mystrengthstraining.com/lms/e12ae3ad-9686-4fc9-9361-134a658371b1 |
| Getting Things Done | https://kumc.mystrengthstraining.com/lms/aa02a853-a566-4b5e-91ef-ea104a9f3f7a |
| Managing Change | https://kumc.mystrengthstraining.com/lms/428e4f27-749c-4529-9021-e6177524f4aa |
| Mindset Resilience | https://kumc.mystrengthstraining.com/lms/bcdc62e3-1f98-48bc-a1ea-811b12d1b857 |
| Motivational Approaches | https://kumc.mystrengthstraining.com/lms/1c645841-2627-45d2-92ac-1a7fc84fe4af |
| Project Management | https://kumc.mystrengthstraining.com/lms/78a833ec-5781-4c5f-874d-2df3b50cee52 |
| Situational Leadership | https://kumc.mystrengthstraining.com/lms/71121542-4bca-4d97-9147-7dcbc2000267 |
| Taking Care of Yourself | https://kumc.mystrengthstraining.com/lms/eb613fe6-0945-4c7a-bad1-c863e0766bf3 |
| Personal Insights | https://kumc.mystrengthstraining.com/personal-insights |
| Bring - Need | https://kumc.mystrengthstraining.com/bring-need |
| Power of 2 · Bring / Need | https://kumc.mystrengthstraining.com/power-of-2 |
| Power of 2 · Descriptive Words | https://kumc.mystrengthstraining.com/power-of-2/descriptive-words |
| Power of 2 · Short Description | https://kumc.mystrengthstraining.com/power-of-2/short-description |
| Power of 2 · The Role I Play | https://kumc.mystrengthstraining.com/power-of-2/role |
| Power of Me | https://kumc.mystrengthstraining.com/power-of-me |

## 5. Other places a Vercel address may be hiding

- **QR codes.** Each session's join QR is drawn from the address you view it at, so open the session on the new site and re-download or re-print it. The coach home QR for participant sign-in works the same way (now points at the site root).
- **Slide decks, handouts, Trello cards, Teams/Outlook templates** that quote a session or sign-in link.
- **Supabase sign-in setting.** In Supabase → Authentication → URL Configuration, add `https://kumc.mystrengthstraining.com` (and later `https://*.mystrengthstraining.com`) to Redirect URLs. **Required before go-live**, or emailed sign-in links will not return to the new site.

## 6. Order of operations

**Before go-live**
1. (You) Add the redirect URL in Supabase (section 5).
2. (You) Test a participant sign-in end to end with `brad.thomison@gmail.com`: request link at the site root, click it, land on `/me`.
3. (You) Update the Acorn links (section 4).
4. (Me, after your OK) Push the test redirect rule and verify path + query handling on Vercel.
5. (You) Send yourself a test of Step A / B emails at your `@kumc.edu` address.

**Go-live (quiet window)**
6. (Me) Swap the test rule for the catch-all, push, and check six sample links.
7. (You) Send Step A, then Step B.
8. (You) Re-print QR codes where needed.

**After**
9. Watch for confusion for 1–2 weeks. Then switch the redirect to permanent (308).
10. Keep the Vercel project alive indefinitely; it only serves redirects and costs nothing.
