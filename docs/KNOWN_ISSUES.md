# Known issues

- Service worker works on Pages (cache filled, checked in Chrome); an offline reload was not run by tools. The desktop app's built-in browser blocks registration.
- Hero shows yellow on days 1-9 (adaptation week), so the day-10 check is the first all-green day.
- Moon delay (about 1.3 s) and ISS "hours home" are demo assumptions.
- Manual check-in values live in page memory only: a reload restores the clean story (intended for judges).
- Why panel shows today's raw value; rules on sleep and mood use a 3-day mean (stated in the rule title).
- When the crew medic is the patient, the commander is shown as backup (demo assumption).
