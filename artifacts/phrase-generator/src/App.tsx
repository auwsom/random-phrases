import { useState, useEffect } from "react";
import { NOUNS, VERBS, ADJECTIVES, ADVERBS, PREPOSITIONS, DETERMINERS } from "./words";

const API_KEY = "f59c1c83-f0d9-437b-8e8a-6ecd94fa7e3f";

type SlotType = "noun" | "verb" | "adj" | "adv" | "prep" | "det";
type Token = SlotType | string;

interface Template {
  name: string;
  example: string;
  tokens: Token[];
}

const TEMPLATES: Template[] = [
  {
    name: "Det · Adj · Noun · Verb · Adv",
    example: "the ancient river flows quietly",
    tokens: ["det", "adj", "noun", "verb", "adv"],
  },
  {
    name: "Noun · Verb · Prep · Det · Adj · Noun",
    example: "wind rises over the distant mountain",
    tokens: ["noun", "verb", "prep", "det", "adj", "noun"],
  },
  {
    name: "Det · Adj · Noun · Verb · Prep · Noun",
    example: "the hollow cave echoes with mystery",
    tokens: ["det", "adj", "noun", "verb", "prep", "noun"],
  },
  {
    name: "Adj · Noun · Verb · Adv",
    example: "ancient rivers flow quietly",
    tokens: ["adj", "noun", "verb", "adv"],
  },
  {
    name: "Prep · Det · Adj · Noun · Noun · Verb",
    example: "beneath the silent forest shadows drift",
    tokens: ["prep", "det", "adj", "noun", "noun", "verb"],
  },
  {
    name: "Noun · of · Adj · Noun · Verb · Adv",
    example: "peak of distant shores glows faintly",
    tokens: ["noun", "of", "adj", "noun", "verb", "adv"],
  },
  {
    name: "Adj · Noun · and · Adj · Noun",
    example: "silent wind and ancient stone",
    tokens: ["adj", "noun", "and", "adj", "noun"],
  },
  {
    name: "Det · Noun · Verb · Prep · Det · Adj · Noun",
    example: "the river falls into the dark valley",
    tokens: ["det", "noun", "verb", "prep", "det", "adj", "noun"],
  },
  {
    name: "Noun · Verb · while · Adj · Noun · Verb",
    example: "stars fade while ancient shadows rise",
    tokens: ["noun", "verb", "while", "adj", "noun", "verb"],
  },
  {
    name: "Adj · Noun · Verb · as · Noun · Verb · Adv",
    example: "pale moon rises as darkness falls slowly",
    tokens: ["adj", "noun", "verb", "as", "noun", "verb", "adv"],
  },
  {
    name: "between · Adj · Noun · and · Adj · Noun",
    example: "between ancient peaks and silent shores",
    tokens: ["between", "adj", "noun", "and", "adj", "noun"],
  },
  {
    name: "Noun · Verb · Prep · Noun",
    example: "wind drifts beyond silence",
    tokens: ["noun", "verb", "prep", "noun"],
  },
];

const SLOT_LISTS: Record<SlotType, string[]> = {
  noun: NOUNS,
  verb: VERBS,
  adj: ADJECTIVES,
  adv: ADVERBS,
  prep: PREPOSITIONS,
  det: DETERMINERS,
};

const SLOT_TYPES = new Set<string>(["noun", "verb", "adj", "adv", "prep", "det"]);

function isSlotType(t: Token): t is SlotType {
  return SLOT_TYPES.has(t);
}

async function getRandomInts(n: number, max: number): Promise<number[]> {
  const body = {
    jsonrpc: "2.0",
    method: "generateIntegers",
    params: { apiKey: API_KEY, n, min: 0, max, replacement: true },
    id: 1,
  };
  const res = await fetch("https://api.random.org/json-rpc/2/invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result.random.data;
}

function browserInts(n: number, max: number): number[] {
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((v) => v % (max + 1));
}

function buildPhrase(template: Template, ints: number[]): string {
  let i = 0;
  return template.tokens
    .map((token) => {
      if (!isSlotType(token)) return token;
      const list = SLOT_LISTS[token];
      const word = list[ints[i] % list.length];
      i++;
      return word;
    })
    .join(" ");
}

function downloadFile(lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "saved-phrases.txt";
  a.click();
  URL.revokeObjectURL(url);
}

async function createGist(phrases: string[], pat: string): Promise<string> {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${pat}`,
    },
    body: JSON.stringify({
      description: "Random Phrase Generator — saved phrases",
      public: true,
      files: {
        "phrases.txt": {
          content: phrases.join("\n"),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return data.html_url;
}

const LABEL_COLOR: Record<string, string> = {
  det: "#7c6cfc",
  adj: "#3b9eff",
  noun: "#4ade80",
  verb: "#fb923c",
  adv: "#f472b6",
  prep: "#facc15",
};

export default function App() {
  const [phrase, setPhrase] = useState<string[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [source, setSource] = useState<"random.org" | "browser" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("phrase-generator:saved");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [lockedTemplate, setLockedTemplate] = useState<number | null>(null);
  const [colorize, setColorize] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [gistLoading, setGistLoading] = useState(false);
  const [gistError, setGistError] = useState<string | null>(null);
  const [gistCopied, setGistCopied] = useState(false);
  const [pat, setPat] = useState(() => sessionStorage.getItem("gh-pat") ?? "");

  useEffect(() => {
    sessionStorage.setItem("gh-pat", pat);
  }, [pat]);

  useEffect(() => {
    try {
      localStorage.setItem("phrase-generator:saved", JSON.stringify(saved));
    } catch {}
  }, [saved]);

  async function generate() {
    setLoading(true);
    setCopied(false);
    try {
      const ints = await getRandomInts(10, 9999);
      const tIdx = lockedTemplate !== null ? lockedTemplate : ints[0] % TEMPLATES.length;
      const tpl = TEMPLATES[tIdx];
      const words = buildPhrase(tpl, ints.slice(1));
      setPhrase(words.split(" "));
      setTemplate(tpl);
      setSource("random.org");
    } catch {
      const ints = browserInts(10, 9999);
      const tIdx = lockedTemplate !== null ? lockedTemplate : ints[0] % TEMPLATES.length;
      const tpl = TEMPLATES[tIdx];
      const words = buildPhrase(tpl, ints.slice(1));
      setPhrase(words.split(" "));
      setTemplate(tpl);
      setSource("browser");
    } finally {
      setLoading(false);
    }
  }

  const phraseStr = phrase.join(" ");

  function copy() {
    if (phraseStr) {
      navigator.clipboard.writeText(phraseStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function savePhrase() {
    if (phraseStr && !saved.includes(phraseStr)) {
      setSaved((s) => [...s, phraseStr]);
    }
  }

  function removePhrase(i: number) {
    setSaved((s) => s.filter((_, idx) => idx !== i));
  }

  async function saveToGist() {
    if (saved.length === 0 || !pat.trim()) return;
    setGistLoading(true);
    setGistError(null);
    setGistUrl(null);
    setGistCopied(false);
    try {
      const url = await createGist(saved, pat.trim());
      setGistUrl(url);
    } catch (e) {
      const msg = e instanceof Error && e.message.includes("403")
        ? "Rate limited — try again in a minute"
        : "Couldn't save gist, try again";
      setGistError(msg);
    } finally {
      setGistLoading(false);
    }
  }

  function copyGistUrl() {
    if (gistUrl) {
      navigator.clipboard.writeText(gistUrl);
      setGistCopied(true);
      setTimeout(() => setGistCopied(false), 1500);
    }
  }

  function renderPhrase() {
    if (!template || phrase.length === 0) return null;
    if (!colorize) {
      return <span style={{ color: "#f1f5f9" }}>{phraseStr}</span>;
    }
    const result: React.ReactNode[] = [];
    let wordIdx = 0;
    template.tokens.forEach((token, ti) => {
      const word = phrase[wordIdx];
      wordIdx++;
      const color = isSlotType(token) ? (LABEL_COLOR[token] ?? "#e2e8f0") : "#94a3b8";
      result.push(<span key={ti} style={{ color }}>{word} </span>);
    });
    return result;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      color: "#e2e8f0",
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "50px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#f8fafc" }}>
          Random Phrase Generator
        </h1>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 13 }}>
          Grammatically structured phrases · true randomness via random.org
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Pattern
          </label>
          <select
            value={lockedTemplate ?? ""}
            onChange={(e) => setLockedTemplate(e.target.value === "" ? null : Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#1e2330",
              border: "1px solid #2d3548",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
            }}
          >
            <option value="">— Random pattern —</option>
            {TEMPLATES.map((t, i) => (
              <option key={i} value={i}>{t.name} · e.g. "{t.example}"</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "9px 28px",
              background: loading ? "#1e3a8a" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          <button
            onClick={() => setColorize((c) => !c)}
            style={{
              padding: "7px 14px",
              background: colorize ? "#1e2330" : "#1e2330",
              color: colorize ? "#4ade80" : "#475569",
              border: `1px solid ${colorize ? "#2d4a3e" : "#2d3548"}`,
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Colors {colorize ? "on" : "off"}
          </button>
        </div>

        {phraseStr && (
          <div style={{
            background: "#1a1f2e",
            border: "1px solid #2d3548",
            borderRadius: 10,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.6, marginBottom: 12, wordBreak: "break-word" }}>
              {renderPhrase()}
            </div>

            {colorize && template && (
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 14, fontFamily: "monospace" }}>
                {template.tokens.map((t, i) => (
                  <span key={i}>
                    <span style={{ color: isSlotType(t) ? LABEL_COLOR[t] : "#64748b" }}>
                      {t.toUpperCase()}
                    </span>
                    {i < template.tokens.length - 1 && <span style={{ color: "#334155" }}> · </span>}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copy} style={btn(copied ? "#166534" : "#1e2330", copied ? "#86efac" : "#94a3b8", copied ? "#166534" : "#2d3548")}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={savePhrase} style={btn("#1e2330", "#94a3b8", "#2d3548")}>
                Save
              </button>
              <span style={{ fontSize: 12, color: source === "random.org" ? "#4ade80" : "#fbbf24", marginLeft: 4 }}>
                {source === "random.org" ? "✓ random.org" : "⚠ browser fallback"}
              </span>
            </div>
          </div>
        )}

        {colorize && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
            {Object.entries(LABEL_COLOR).map(([type, color]) => (
              <span key={type} style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                ● {type}
              </span>
            ))}
            <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ● literal
            </span>
          </div>
        )}

        {saved.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Saved ({saved.length})
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => downloadFile(saved)} style={btn("#1e2330", "#60a5fa", "#2d3548")}>
                  Download .txt
                </button>
                <button
                  onClick={saveToGist}
                  disabled={gistLoading || !pat.trim()}
                  title={!pat.trim() ? "Enter a GitHub PAT below to save" : undefined}
                  style={btn(gistLoading ? "#1e2330" : "#1e2330", (gistLoading || !pat.trim()) ? "#475569" : "#a78bfa", "#2d3548")}
                >
                  {gistLoading ? "Saving…" : "Save to Gist"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="password"
                placeholder="GitHub PAT (ghp_…) — for Gist saving"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                style={{
                  flex: 1,
                  padding: "5px 10px",
                  background: "#1a1f2e",
                  border: `1px solid ${pat.trim() ? "#2d4a3e" : "#2d3548"}`,
                  borderRadius: 5,
                  color: "#e2e8f0",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "monospace",
                }}
              />
              {pat && (
                <button onClick={() => setPat("")} style={btn("#1e2330", "#475569", "#2d3548")}>
                  Clear
                </button>
              )}
            </div>

            {gistUrl && (
              <div style={{ background: "#162320", border: "1px solid #2d4a3e", borderRadius: 6, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Saved!</span>
                <a href={gistUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#60a5fa", wordBreak: "break-all" }}>
                  {gistUrl}
                </a>
                <button onClick={copyGistUrl} style={btn("#1e2330", gistCopied ? "#86efac" : "#94a3b8", "#2d3548")}>
                  {gistCopied ? "Copied!" : "Copy URL"}
                </button>
              </div>
            )}

            {gistError && (
              <div style={{ background: "#2a1515", border: "1px solid #4a2d2d", borderRadius: 6, padding: "8px 14px", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#f87171" }}>Gist error: {gistError}</span>
              </div>
            )}

            {saved.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e2330", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#94a3b8", flex: 1 }}>{p}</span>
                <button onClick={() => removePhrase(i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function btn(bg: string, color: string, border: string) {
  return { fontSize: 12, padding: "4px 14px", background: bg, color, border: `1px solid ${border}`, borderRadius: 5, cursor: "pointer" as const };
}
