export type NoteTemplateId =
  | "blank"
  | "prayer"
  | "reflection"
  | "gratitude"
  | "decision"
  | "checklist"
  | "journal"
  | "sermon-notes"
  | "bible-study"
  | "confession"
  | "anxiety-dump"
  | "dream"
  | "meeting-notes"
  | "goal";

export interface NoteTemplate {
  id: NoteTemplateId;
  label: string;
  titlePlaceholder: string;
  body: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    label: "Blank note",
    titlePlaceholder: "A title for your note",
    body: "",
  },
  {
    id: "prayer",
    label: "Prayer",
    titlePlaceholder: "Prayer",
    body: `## Prayer

Today I want to bring...

## What I am feeling

## What I am asking for

## What I want to remember
`,
  },
  {
    id: "reflection",
    label: "Reflection",
    titlePlaceholder: "Reflection",
    body: `## Reflection

What happened?

## What stood out?

## What I learned

## Next step
`,
  },
  {
    id: "gratitude",
    label: "Gratitude",
    titlePlaceholder: "Gratitude",
    body: `## Gratitude

Today I am grateful for:

- 
- 
- 
`,
  },
  {
    id: "decision",
    label: "Decision",
    titlePlaceholder: "Decision",
    body: `## Decision

What decision am I considering?

## Options

- 
- 

## What matters most?

## Next step
`,
  },
  {
    id: "checklist",
    label: "Checklist",
    titlePlaceholder: "Checklist",
    body: `## Checklist

- [ ] 
- [ ] 
- [ ] 
`,
  },
  {
    id: "journal",
    label: "Journal",
    titlePlaceholder: "Journal",
    body: `## Journal

Today...

## What I want to remember

## Tomorrow
`,
  },
  {
    id: "sermon-notes",
    label: "Sermon Notes",
    titlePlaceholder: "Sermon Notes",
    body: `## Sermon Notes

Speaker:

Passage:

## Main points

- 
- 
- 

## What stood out?

## What will I apply?
`,
  },
  {
    id: "bible-study",
    label: "Bible Study",
    titlePlaceholder: "Bible Study",
    body: `## Bible Study

Passage:

## Observation

## Interpretation

## Application

## Prayer
`,
  },
  {
    id: "confession",
    label: "Confession",
    titlePlaceholder: "Confession",
    body: `## Confession

What do I need to bring honestly?

## What happened?

## What do I want to change?

## Next step
`,
  },
  {
    id: "anxiety-dump",
    label: "Anxiety Dump",
    titlePlaceholder: "Anxiety Dump",
    body: `## What is on my mind?

## What can I control?

## What can I release?

## One next step
`,
  },
  {
    id: "dream",
    label: "Dream",
    titlePlaceholder: "Dream",
    body: `## Dream

What I remember:

## Feelings

## Possible meaning

## What I want to remember
`,
  },
  {
    id: "meeting-notes",
    label: "Meeting Notes",
    titlePlaceholder: "Meeting Notes",
    body: `## Meeting Notes

Date:

## Topics

- 

## Decisions

- 

## Action items

- [ ] 
`,
  },
  {
    id: "goal",
    label: "Goal",
    titlePlaceholder: "Goal",
    body: `## Goal

What do I want to achieve?

## Why does it matter?

## Next actions

- [ ] 
- [ ] 
`,
  },
];

export const REQUIRED_TEMPLATE_IDS: NoteTemplateId[] = [
  "blank",
  "prayer",
  "reflection",
  "gratitude",
  "decision",
  "checklist",
  "journal",
  "sermon-notes",
  "bible-study",
  "confession",
  "anxiety-dump",
  "dream",
  "meeting-notes",
  "goal",
];

export function getNoteTemplate(id: NoteTemplateId): NoteTemplate {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? NOTE_TEMPLATES[0];
}

/** Daily note flow uses the Journal template body. */
export const DAILY_NOTE_TEMPLATE_ID: NoteTemplateId = "journal";
