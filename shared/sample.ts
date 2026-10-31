// A small sample project written for Handwave's demo mode. It is NOT a real user's app,
// and findings on it must never be presented as real discoveries.
import type { SourceFile } from "./types.js";

export const SAMPLE_CONTEXT = "Supabase database, email login";

export const SAMPLE_FILES: SourceFile[] = [
  {
    name: "src/lib/notes.ts",
    content: `import { supabase } from "./supabaseClient";

export interface Note {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export async function saveNote(userId: string, body: string) {
  const { error } = await supabase.from("notes").insert({ user_id: userId, body });
  console.log("save attempted", error);
  return { ok: true };
}

export async function listNotes(): Promise<Note[]> {
  const { data } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}
`,
  },
  {
    name: "src/components/NoteEditor.tsx",
    content: `import { useState } from "react";
import { saveNote } from "../lib/notes";
import { toast } from "./toast";

export function NoteEditor({ userId }: { userId: string }) {
  const [body, setBody] = useState("");

  async function onSave() {
    await saveNote(userId, body);
    toast("Saved!");
    setBody("");
  }

  return (
    <div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      <button onClick={onSave}>Save note</button>
    </div>
  );
}
`,
  },
  {
    name: "supabase/migrations/001_notes.sql",
    content: `create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Anyone signed in can read notes"
  on notes for select
  to authenticated
  using (true);

create policy "Users can insert their own notes"
  on notes for insert
  to authenticated
  with check (auth.uid() = user_id);
`,
  },
];

export const SAMPLE_EXPLANATION =
  "When I type a note and press save, it goes into the notes table in Supabase with my user ID. Only I can see my own notes, I think the login handles that. If saving fails, it should show an error message. The OpenAI key is kept on the server so nobody can see it.";

/** Canned model output for the sample. It deliberately includes one fabricated and one too-short quote so the safeguards are visible. */
export const SAMPLE_EXTRACT_RESPONSE = {
  claims: [
    { text: "Saving a note stores it in the Supabase notes table with the user's ID.", sourceSpan: "it goes into the notes table in Supabase with my user ID", category: "data" },
    { text: "Only the owner of a note can read it.", sourceSpan: "Only I can see my own notes", category: "access" },
    { text: "If saving fails, the app shows an error message.", sourceSpan: "If saving fails, it should show an error message", category: "failure" },
    { text: "The OpenAI key is kept on the server, so users can't see it.", sourceSpan: "The OpenAI key is kept on the server", category: "secrets" },
  ],
  unexplained: [
    { phrase: "I think the login handles that", question: "What exactly stops another signed-in user from reading your notes?" },
  ],
};

export const SAMPLE_CHECK_RESPONSE = {
  verdicts: [
    {
      claimId: "c1",
      verdict: "SUPPORTED",
      explanation: "saveNote inserts a row into the notes table with the user_id and body.",
      quotes: [{ file: "src/lib/notes.ts", text: 'const { error } = await supabase.from("notes").insert({ user_id: userId, body });' }],
      alternativeInterpretation: "",
      missingContext: "",
      consequence: "NONE",
      manualTest: { steps: ["Save a note.", "Open the notes table in the Supabase dashboard."], expected: "A new row with your user ID and the note text." },
    },
    {
      claimId: "c2",
      verdict: "CONTRADICTED",
      explanation: "The only read policy on notes allows any signed-in user to read every row, and listNotes selects all notes without filtering by user.",
      quotes: [
        { file: "supabase/migrations/001_notes.sql", text: 'create policy "Anyone signed in can read notes"\n  on notes for select\n  to authenticated\n  using (true);' },
        { file: "src/lib/notes.ts", text: 'select("*")' },
      ],
      alternativeInterpretation: "A later migration not included here could replace this policy with one that checks auth.uid() = user_id.",
      missingContext: "Any other migrations or policies on the notes table.",
      consequence: "HIGH",
      manualTest: {
        steps: ["Sign in as account A and save a note.", "Open a private window and sign in as a different account B.", "Open the notes list."],
        expected: "If your belief is right, account B does not see account A's note.",
      },
    },
    {
      claimId: "c3",
      verdict: "CONTRADICTED",
      explanation: "saveNote logs the error and always returns ok: true, and the editor shows 'Saved!' without checking the result.",
      quotes: [
        { file: "src/lib/notes.ts", text: 'console.log("save attempted", error);\n  return { ok: true };' },
        { file: "src/components/NoteEditor.tsx", text: 'await saveNote(userId, body);\n    toast("Saved!");' },
      ],
      alternativeInterpretation: "A global error handler elsewhere could show errors, but saveNote never throws, so it would not be triggered.",
      missingContext: "",
      consequence: "MEDIUM",
      manualTest: {
        steps: ["Open the app and your browser's developer tools.", "In the Network tab, switch to Offline.", "Type a note and press Save note."],
        expected: "If your belief is right, an error message appears instead of 'Saved!'.",
      },
    },
    {
      claimId: "c4",
      verdict: "SUPPORTED",
      explanation: "The key is read from a server environment variable.",
      quotes: [{ file: "src/lib/notes.ts", text: "const openaiKey = process.env.OPENAI_API_KEY;" }],
      alternativeInterpretation: "",
      missingContext: "The file that calls OpenAI was not uploaded.",
      consequence: "NONE",
      manualTest: { steps: ["Open your deployed app, view the page source and search for 'sk-'."], expected: "No key appears." },
    },
  ],
};

export function isSampleProject(files: SourceFile[]): boolean {
  if (files.length !== SAMPLE_FILES.length) return false;
  return SAMPLE_FILES.every((s) => files.some((f) => f.name === s.name && f.content.replace(/\r\n?/g, "\n") === s.content));
}
