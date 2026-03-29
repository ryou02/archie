# In-Chat Build Card Design

## Goal

Replace the separate right-side progress/task rail with a chat-first execution experience where:

- normal conversation remains scrollable in the right-side chat area
- a live build card appears only when Archie starts executing a build
- the live build card is docked above the input while the build is active
- completed or failed build cards are archived into chat history as collapsed summary rows
- archived rows can be reopened to inspect the full task breakdown and action details

This should feel closer to Codex-style chat sessions: the build experience lives inside the conversation instead of beside it.

## Interaction Model

### Fresh chat

- The right side shows only chat history and the input row.
- There is no build card and no persistent execution rail.

### Planning phase

- User and Archie talk normally in the chat history.
- Planning messages stay as regular text messages.
- No live build card is shown yet.

### Execution starts

- Once Archie moves from planning into execution, the UI creates an active build session.
- A live build card appears in a docked slot above the input.
- The chat history remains visible and scrollable above it.
- The active build card updates in place while the server runs tools.

### Execution ends

- The docked live build card is removed.
- A compact archived summary row for that run is inserted into the chat history.
- The archived row can be expanded inline to reveal the full final task breakdown.

### Subsequent builds

- Every new build creates a fresh active session and, once finished, a new archived summary row.
- Older build rows remain in the chat history for comparison and review.

## Active Build Card

The live build card is a structured UI block, not plain text.

### Required contents

- Build title
- Run status
- Overall progress bar
- Ordered task rows
- Per-task progress percentages
- Per-task action detail line

### Task-row behavior

Each task row contains:

- task label
- percent complete
- current action subline

Example shape:

- `Place key objects`
- `40%`
- `placing stadium`

Only one task is active at a time. Completed tasks remain visible above the active task.

### Detail level

The card should show execution detail at the task level, not raw log spam.

Do:

- `searching for stadium assets`
- `placing running track`
- `creating lap script`

Do not:

- dump raw tool payloads into the UI
- show terminal-style logs directly in the card

## Archived Summary Row

Completed or failed runs become compact rows in chat history.

### Summary row contents

- Build name
- Final status badge
- Elapsed time
- One-line summary

### Expanded view

Expanding a row reveals:

- the full completed task list
- final per-task progress
- final action detail for each task
- overall run outcome

Archived rows are immutable snapshots of completed or failed runs.

## Layout

### Right-side workspace

The right side becomes a unified chat workspace.

Structure:

1. Scrollable chat history
2. Conditional active build slot
3. Input row

The active build slot only exists during execution.

### Left side

The left-side preview area can remain focused on Archie and the build preview. The progress/task rail is removed from the side layout because that responsibility moves into the chat workspace.

## State Model

The UI state for build execution should support:

- `idle`
- `planning`
- `running`
- `completed`
- `failed`

### State meanings

- `idle`: no active build card
- `planning`: regular chat only, no active build card yet
- `running`: docked live build card visible and updating
- `completed`: docked card archived into chat history
- `failed`: docked card archived into chat history with failure state preserved

## Data Model

Each build session should be represented explicitly.

```js
{
  id,
  title,
  status,
  startedAt,
  endedAt,
  summary,
  overallProgress,
  tasks: [
    {
      id,
      label,
      progress,
      status,
      detail
    }
  ]
}
```

### Notes

- `overallProgress` is derived from task progress, not separately invented.
- `detail` is the latest human-readable action for that task.
- Archived sessions keep their final snapshot intact.

## Execution Data Flow

### Source of truth

The build UI must be driven by live execution state from the server, not just by final response text.

### Server responsibilities

- Create an explicit build session when Archie starts executing
- Categorize tool calls into task buckets
- Update the active session’s task progress and detail as tools run
- Expose the active session state through a polling endpoint
- Finalize the session when the run completes or fails

### Client responsibilities

- Poll the active session while a request is in flight
- Render the docked active build card from the live session payload
- Archive the final session into chat history when execution ends
- Stop polling once the run is complete or failed

## Task Progress Semantics

Task progress should represent actual build activity.

### Rules

- Planning-only chat should not create progress UI
- Execution creates a session and starts progress updates
- Tool categories map to task buckets
- Task detail lines reflect the latest action inside that bucket
- Overall progress is computed from current task progress

### Example mapping

- environment tools -> `Build the world`
- asset search and placement -> `Place key objects`
- character and animation work -> `Add characters and motion`
- script creation and code execution -> `Script gameplay`
- sound searches and audio insertion -> `Layer in audio`

## Failure Handling

If execution fails:

- the active build card switches to `Failed`
- the last known task/action details remain visible
- the failed run is archived into chat history as a collapsed summary row
- expanding the row reveals the final partial state

If polling fails temporarily:

- keep the last visible live state
- retry polling
- do not clear the card immediately

## File Boundaries

### Frontend

- `web/public/index.html`
  - remove the separate progress/task rail structure
  - add the unified chat workspace layout and active build slot

- `web/public/style.css`
  - style the docked live build card
  - style archived collapsed summary rows and expanded run details

- `web/public/js/chat.js`
  - support structured archived build-session messages in history

- `web/public/js/app.js`
  - orchestrate active build lifecycle, polling, and archive transition

- `web/public/js/task-panel.js`
  - replace or split into a new build-card renderer for the in-chat session UI

- `web/public/js/api.js`
  - expose active session polling helpers

### Backend

- `web/server.js`
  - create and update explicit build sessions
  - expose active session payloads for polling

- `web/task-plan.js`
  - continue to generate task buckets and map tool activity into live task progress

## Testing

### Functional checks

- Fresh chat shows no build card
- Planning-only conversation shows no build card
- Execution creates exactly one docked active build card
- Live task detail changes while tools run
- Completed run archives once into history
- Failed run archives once into history
- Archived rows expand and collapse correctly

### Regression checks

- Chat history remains scrollable during execution
- Input remains usable according to the chosen interaction rules
- Multiple build sessions can exist in history without overwriting one another
- The right side does not recreate the old persistent rail behavior

## Recommendation

Implement this as a hybrid dock-and-archive model:

- docked while active
- archived into chat history when done

That matches the target interaction model more closely than either a permanent side rail or a purely in-thread live card that can scroll out of view during execution.
