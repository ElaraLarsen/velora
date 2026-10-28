export interface PromiseCard {
  id: string;
  title: string;
  question: string;
  hint: string;
}

/** The five questions, each based on a common way AI-built apps go wrong. */
export const PROMISE_CARDS: PromiseCard[] = [
  {
    id: "data-access",
    title: "Who can see saved data?",
    question: "When someone saves something in this feature, where exactly does it go, and who else could read it?",
    hint: "Walk through the save, step by step. Say who can read it afterwards and what stops everyone else.",
  },
  {
    id: "logged-out",
    title: "What can logged-out users do?",
    question: "What happens if someone who isn't logged in tries to use this feature?",
    hint: "Think about opening the page directly, calling it without logging in, or after a session expires.",
  },
  {
    id: "failure",
    title: "What happens when something fails?",
    question: "What does the user see when a network call, database write or AI call fails halfway through?",
    hint: "Name what the user sees, and whether anything is half-saved.",
  },
  {
    id: "cost",
    title: "What costs money per use?",
    question: "What in this feature costs money each time it runs, and what stops someone running it up?",
    hint: "AI calls, emails, SMS, storage. Limits, logins, caps.",
  },
  {
    id: "secrets",
    title: "Where are the keys?",
    question: "Which keys or secrets does this feature use, and where could someone see them?",
    hint: "Say where each key lives: browser code, server, environment variables.",
  },
];

export function cardById(id: string): PromiseCard | undefined {
  return PROMISE_CARDS.find((c) => c.id === id);
}
