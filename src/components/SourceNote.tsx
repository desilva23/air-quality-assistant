export interface SourceNoteProps {
  source: "ai" | "fallback";
  notice?: string;
}

/** Says whether content was written by the AI or is the built-in guidance. */
export function SourceNote({ source, notice }: SourceNoteProps) {
  return (
    <p className={`source-note ${source}`}>
      {source === "ai"
        ? "Written by AI (Groq) from the live data and your answers. Numbers are computed by the app."
        : (notice ?? "Built-in guidance.")}
    </p>
  );
}
