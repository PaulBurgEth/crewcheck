# Internal data contract

All modules are plain ES modules (no build), importable in the browser and in Node (`node --test`). No DOM access in `js/data`, `js/engine`, `js/demo`.

## Day record (one per crew member per mission day)
```js
{
  day: 1..180,            // mission day
  // suit stream (auto, modelled on CSA Bio-Monitor), daily resting summary
  hr: 62,                 // resting heart rate, bpm
  sbp: 116, dbp: 74,      // blood pressure, mmHg
  rr: 14,                 // respiratory rate, breaths/min
  temp: 36.7,             // core body temperature estimate, °C
  spo2: 98,               // %
  exerciseMin: 90,        // exercise minutes (actigraphy)
  sleepH: 7.3,            // sleep hours (actigraphy, assumption)
  // manual check-in (null when skipped)
  mood: 4,                // 1..5
  vision: 0,              // 0 = no change, 1 = new blurred vision
  headache: 0,            // 0..3
  glucose: 88,            // fasting, mg/dL
  mass: 71.2,             // kg
  // environment
  doseMSv: 0.6            // radiation dose that day, mSv
}
```
Any field except `day` may be `null` (sensor gap or skipped check-in).

## Crew member
```js
{ id: 'maya', name: 'Maya Okafor', role: 'Mission specialist', hero: true, records: [/* 180 day records */] }
```

## Signals and systems
| signal | system |
|---|---|
| sbp, dbp, hr | heart |
| spo2, rr | lungs |
| vision, headache | eyes |
| sleepH | sleep |
| mood | mind |
| exerciseMin, mass | bones |
| glucose, temp | metabolic |

Systems: `heart`, `lungs`, `eyes`, `sleep`, `mind`, `bones`, `metabolic`.
Status: `green` | `yellow` | `red` (`grey` = no data).
Escalation tiers: `self` | `crew` | `earth` (`none` when green).
