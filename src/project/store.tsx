import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { z } from "zod";
import { focus } from "../focus/focusStore";
import { storedRecord } from "../storage/local";
import { createProject, projectReducer, type ProjectAction } from "./reducer";
import type { Project } from "./types";

// The project lives in memory only: files, claims, evidence, tasks and the checklist are never written
// to localStorage, IndexedDB or a server, and refreshing or closing the page discards them.
// The one exception is the three dates the user typed (competition start, official deadline and
// their own deadline). They contain no code and are kept in this browser (storage/local.ts) so a
// refresh doesn't lose them.

const deadlines = storedRecord(
  "velora.deadlines.v1",
  z.object({ submission: z.number().nullable(), personal: z.number().nullable(), start: z.number().nullable() }),
  () => ({ submission: null, personal: null, start: null }),
);

/** Changes to the project's own data. Navigation and view changes are not activity. */
const ACTIVITY = new Set<ProjectAction["type"]>(["setFiles", "setContext", "setExplanation", "setExtraction", "updateClaims", "setCheckResult", "setFinding", "updatePlanner", "updateChecklist", "updateRubric"]);

interface ProjectStore {
  project: Project;
  dispatch: Dispatch<ProjectAction>;
}

const ProjectContext = createContext<ProjectStore | null>(null);

export function ProjectProvider({ children, initial }: { children: ReactNode; initial?: Project }) {
  const [project, rawDispatch] = useReducer(projectReducer, initial, (start) => {
    if (start) return start;
    const p = createProject();
    return { ...p, planner: { ...p.planner, ...deadlines.read() } };
  });
  const { submission, personal, start } = project.planner;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (!initial) deadlines.write({ submission, personal, start });
  }, [submission, personal, start, initial]);

  const dispatch = useCallback<Dispatch<ProjectAction>>((a) => {
    if (ACTIVITY.has(a.type)) focus.activity();
    rawDispatch(a);
  }, []);
  const value = useMemo(() => ({ project, dispatch }), [project, dispatch]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectStore {
  const store = useContext(ProjectContext);
  if (!store) throw new Error("useProject must be used inside <ProjectProvider>.");
  return store;
}
