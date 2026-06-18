export type NoteTemplateId =
  | "blank"
  | "prayer"
  | "reflection"
  | "gratitude"
  | "decision"
  | "checklist";

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
];

export function getNoteTemplate(id: NoteTemplateId): NoteTemplate {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? NOTE_TEMPLATES[0];
}
