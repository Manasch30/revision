# Adaptive Spaced Revision — VS Code Build Specification

Build a fully offline Android-friendly revision planner based on **spaced retrieval**, not a rigid Ebbinghaus timetable.

## Core hierarchy

```text
Subject
└── Topic
```

Revision events are scheduled instances of the topic, NOT subtasks.

## User interaction

When a topic is due, show exactly three recall choices:

- **Forget** — I could not retrieve it / major gaps.
- **Hard** — I retrieved it but struggled.
- **Good** — I retrieved it reasonably well.

Do NOT add an Easy button.

"Good" is intentionally the best available result. It means remembered adequately, not effortless.

## Initial schedule

A new topic gets its first retrieval check at:

**20 minutes after learning**

The user logs:

- Subject
- Topic
- Date
- Time

Store the original completion timestamp.

## Adaptive scheduling

All future intervals are calculated from the most recent review result.

Default heuristic:

```text
Forget:
  next interval = max(20 min, previous interval × 0.25)

Hard:
  next interval = max(60 min, previous interval × 1.8)

Good:
  next interval = max(120 min, previous interval × 3)
```

Apply gradual-growth safeguards so the first Good reviews do not jump absurdly far ahead.

These are heuristic defaults, NOT claims of a scientifically optimal sequence.

The core principle is:

```text
Forget → shorter interval
Hard   → moderate increase
Good   → larger increase
```

## Important model

Do NOT create:

```text
Topic
  ├── 20 min subtask
  ├── 1 hour subtask
  └── 2 day subtask
```

Instead:

```text
Topic
  ↓
Review history
  ↓
Current next-review timestamp
```

Each completed review is a historical event.

The topic has one current `nextAt` value.

## Suggested data model

```js
{
  id,
  subjectId,
  name,
  completedAt,

  intervalMin: 20,
  nextAt,

  reviews: [
    {
      id,
      scheduledAt,
      intervalMin,
      result: "forget" | "hard" | "good",
      doneAt
    }
  ]
}
```

## Required screens

### Today

Primary screen.

Show reviews whose `nextAt <= now`.

Each card:

```text
Biology
Cell Structure
Due 10:30 AM

[ Forget ] [ Hard ] [ Good ]

Current interval: 2 days
```

After selecting a result:

1. Record the review result.
2. Calculate the next interval.
3. Create a new historical review record.
4. Update `nextAt`.
5. Remove it from Today if it is no longer due.

### Subjects & Topics

Allow:

- Add subject
- Add topic
- Log topic with exact date + time
- Delete topic
- Delete subject

### Schedule

Show topics grouped by their current interval:

```text
20 min
2 hr
6 hr
1 day
2 days
3 days
7 days
14 days
```

This is a visualization of current scheduling, not task nesting.

### Calendar

Monthly calendar showing the current `nextAt` of every topic.

Each event should include:

```text
Cell Structure
Biology
7:30 PM
```

Tapping an event should show its stage/current interval and recall history.

## Time requirements

This is a time-based application.

Use local device time for display.

Store timestamps as ISO datetimes.

Calculate intervals from timestamps.

Do not use date-only arithmetic for minute/hour intervals.

Correctly handle:

- midnight
- month changes
- year changes
- timezone conversion
- multiple reviews on the same date
- multiple topics logged at different times

## Offline

No backend.

No login.

No remote APIs.

Use vanilla HTML/CSS/JS plus:

- localStorage or IndexedDB
- service worker
- web app manifest

Add JSON export/import if possible for backup.

## Scientific framing

Describe the application as an **adaptive spaced-retrieval planner inspired by forgetting-curve research**.

Do not claim that the exact multipliers are the Ebbinghaus formula or that the 20-minute interval is universally optimal.

The evidence-backed design principle is:

**active retrieval + appropriately spaced reviews + adapting to recall performance.**

## UX goal

The app should feel like it manages the learner's memory workload.

The user should NOT think:

> "I have to do eight fixed reviews."

Instead:

> "I learned this. The app will tell me when it is worth retrieving it again."

Keep the three choices extremely simple:

**Forget · Hard · Good**
