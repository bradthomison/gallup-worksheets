# Cutover plan: Vercel → mystrengthstraining.com

Goal: anyone who follows an old Vercel link ends up in the right place on `kumc.mystrengthstraining.com`, and everyone has one address to remember.

Status as of 2026-10-23: the app already runs on Cloudflare at `kumc.mystrengthstraining.com` against the same Supabase database. Vercel (`gallup-worksheets.vercel.app`) is still the live site. The redirect has been tested but is not switched on yet.

## 1. Why no mass resend is needed

Until now, participants reached the app through a QR code shown during a session, and there was no way to get back to it afterwards. The participant home page (`/me`) is the fix. KUMC blocked outgoing mail containing the Vercel address, so no old link was ever circulated by email. A test message with the new address was **not** blocked.

So: no "we've moved" email, no bulk resend. The new address (`kumc.mystrengthstraining.com`) goes out for the first time, on your schedule.

What the redirect still covers: old QR scans, browser history and bookmarks, coach bookmarks, and anything off the KUMC network. People on the KUMC network could not load Vercel anyway, so for them the new address is simply the first link they get.

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

## 3. Sending the new address

Give people the root address, `https://kumc.mystrengthstraining.com` (shown as the QR code on the coach home page). They enter their email, receive a sign-in link, and land on their own page. Nothing else needs to be sent.

**One thing to test (not yet confirmed):** the sign-in email is sent by the app, from the sign-in service, to each person's inbox, and the link inside it points at the data service's address (a `supabase.co` address), not at `mystrengthstraining.com`. Send a sign-in link to a real `@kumc.edu` address and check that it arrives (not quarantined) and the link opens. Your own sends from Outlook with the new address already pass.

Optional later: record when a link was last sent to each person, so future moves don't have to guess.

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

**Done**
1. Redirect URL added in Supabase.
2. Participant sign-in tested end to end.
3. Redirect rule tested on Vercel (path and query string both survive).

**Still to do**
4. (You) Test a sign-in link to an `@kumc.edu` address (section 3).
5. (You) Update the Acorn links (section 4), whenever convenient.
6. (You) Give the other two coaches a heads-up: new address, and they sign in again once.
7. (Me, when you say go) Swap the test rule for the catch-all, push, and check six sample links.
8. (You) Re-print or re-download session QR codes where they will be reused (section 5).

**After**
9. Watch for confusion for 1–2 weeks, then switch the redirect to permanent (308).
10. Keep the Vercel project alive indefinitely; it only serves redirects and costs nothing.
