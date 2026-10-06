# Keeping Tabs on Subs: tester guide

Thanks for helping. This is about 15 minutes, on your phone if you can.

## What this is

Keeping Tabs on Subs is a small app that shows every subscription you pay for, sorted by when it renews next. For each one it works out the last day you can cancel without being charged again (the "cancel-by" date), so you can decide in time instead of finding out after a renewal. It is an early demo, so expect rough edges.

## Signing in

Xiao will send you an email address and password privately. Open the link Xiao gave you, sign in, and you will land on a list that already holds a few made-up subscriptions (for example The Daily Ledger, VoiceDraft Pro and CodePilot Pro). None of it is real.

If you only want a look around first, the link plus `/demo` shows a read-only sample with no sign-in.

## Five things to try

**1. Find your next decision.** Look at the list and the "Due soon" section. Which subscription do you have to decide on first, and by what date? Say it out loud before you tap anything.

**2. Add one you made up.** Tap the add button and describe a subscription in your own words, for example "PhotoVault, 4.99 euros a month, next charge on the 20th". The app reads it (about 10 seconds) and shows you a proposal to check and approve. You can also try "Screenshot or PDF" with a made-up billing page, or "Paste email". Invent everything: please never use your real subscriptions, receipts, screenshots or account details, because what you add is sent to Anthropic's Claude model to be read. "Enter it yourself" opens a plain form instead.

**3. Change the notice period, then cancel it.** Open the subscription you just added and edit it. Give it a different notice period (days before renewal you need to cancel by) and watch the cancel-by date move. Then open it again and tap "Mark as cancelled": enter the date, how you cancelled (a made-up confirmation number is fine) and, if you like, an "access until" date. It should move to an "Ending" group, and the subscription page now shows a History entry with what you entered. "Reopen" brings it back.

**4. Review a proposed entry.** Under "Due soon", the list shows "1 new entry to check": entries the app picked up that are not in your list yet. Open it, read what the app picked up, answer the question it asks (the billing page it read did not say how often you pay), check the pre-filled form below and pick a category and approve the entry. It should now appear in your list. (Rejecting it instead leaves the list unchanged.)

**5. Decide on a reminder.** Under "Due soon", tap "Keep" on one entry: it leaves the box until its next renewal (the green note has an Undo). Open another entry and, under "Reminders", try "Keep quietly". Reminders also arrive by email in the early morning (Berlin time), at most one a day and only when something is due; you can switch email off in Settings (top right). The email's buttons open the app first and change nothing until you confirm.

## What it does not do yet

- No delete: you can cancel an entry, not remove it.
- No password change.

## Giving feedback

Please note every moment you hesitated, got confused, or had to guess what something meant, even if it turned out fine. A short list is perfect: what you were trying to do, what you expected, what happened. Send it to Xiao by message or email. Anything that felt slow or unclear is useful, and there are no wrong answers.

Your test account and everything in it will be deleted after the test round.
