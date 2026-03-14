import { useState, useEffect } from "react";

const API_KEY = "f59c1c83-f0d9-437b-8e8a-6ecd94fa7e3f";

async function loadWordList(): Promise<string[]> {
  try {
    const res = await fetch(
      "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt"
    );
    const text = await res.text();
    return text
      .trim()
      .split("\n")
      .map((line) => line.split("\t")[1]?.trim())
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

async function fetchRandomIndices(count: number, max: number): Promise<number[]> {
  const body = {
    jsonrpc: "2.0",
    method: "generateIntegers",
    params: { apiKey: API_KEY, n: count, min: 0, max: max - 1, replacement: false },
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

function fallbackIndices(count: number, max: number): number[] {
  const arr = new Uint32Array(count);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((n) => n % max);
}

function downloadFile(lines: string[]) {
  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "saved-phrases.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [words, setWords] = useState<string[]>([]);
  const [wordListStatus, setWordListStatus] = useState<"loading" | "loaded" | "fallback">("loading");
  const [wordCount, setWordCount] = useState(10);
  const [phrase, setPhrase] = useState("");
  const [source, setSource] = useState<"random.org" | "browser" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    loadWordList().then((list) => {
      if (list.length > 0) {
        setWords(list);
        setWordListStatus("loaded");
      } else {
        setWordListStatus("fallback");
      }
    });
  }, []);

  async function generate() {
    if (words.length === 0) return;
    setLoading(true);
    setCopied(false);
    try {
      const indices = await fetchRandomIndices(wordCount, words.length);
      const result = indices.map((i) => words[i]).join(" ");
      setPhrase(result);
      setSource("random.org");
    } catch {
      const indices = fallbackIndices(wordCount, words.length);
      const result = indices.map((i) => words[i]).join(" ");
      setPhrase(result);
      setSource("browser");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (phrase) {
      navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function savePhrase() {
    if (phrase && !saved.includes(phrase)) {
      setSaved((s) => [...s, phrase]);
    }
  }

  function removePhrase(i: number) {
    setSaved((s) => s.filter((_, idx) => idx !== i));
  }

  const isReady = wordListStatus !== "loading";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      color: "#e2e8f0",
      fontFamily: "system-ui, sans-serif",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "60px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#f8fafc" }}>
          Random Phrase Generator
        </h1>
        <p style={{ color: "#64748b", marginBottom: 6, fontSize: 13 }}>
          True randomness via random.org atmospheric noise.
        </p>
        <p style={{ color: "#475569", marginBottom: 28, fontSize: 12 }}>
          {wordListStatus === "loading" && "Loading EFF word list (7,776 words)…"}
          {wordListStatus === "loaded" && `Word list: ${words.length.toLocaleString()} words (EFF large diceware)`}
          {wordListStatus === "fallback" && "Word list failed to load — refresh to retry"}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "#94a3b8" }}>Words:</label>
          <input
            type="number"
            min={1}
            max={20}
            value={wordCount}
            onChange={(e) => setWordCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            style={{
              width: 56,
              padding: "7px 10px",
              background: "#1e2330",
              border: "1px solid #2d3548",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={generate}
            disabled={loading || !isReady}
            style={{
              padding: "8px 22px",
              background: loading || !isReady ? "#1e3a8a" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading || !isReady ? "wait" : "pointer",
            }}
          >
            {wordListStatus === "loading" ? "Loading…" : loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {phrase && (
          <div style={{
            background: "#1a1f2e",
            border: "1px solid #2d3548",
            borderRadius: 10,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.5, marginBottom: 16, wordBreak: "break-word" }}>
              {phrase}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button onClick={copy} style={btnStyle(copied ? "#166534" : "#1e2330", copied ? "#86efac" : "#94a3b8", copied ? "#166534" : "#2d3548")}>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={savePhrase} style={btnStyle("#1e2330", "#94a3b8", "#2d3548")}>
                Save
              </button>
              <span style={{ fontSize: 12, color: source === "random.org" ? "#4ade80" : "#fbbf24", marginLeft: 4 }}>
                {source === "random.org" ? "✓ random.org" : "⚠ browser fallback"}
              </span>
            </div>
          </div>
        )}

        {saved.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Saved ({saved.length})
              </p>
              <button
                onClick={() => downloadFile(saved)}
                style={btnStyle("#1e2330", "#60a5fa", "#2d3548")}
              >
                Download .txt
              </button>
            </div>
            {saved.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #1e2330",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 13, color: "#94a3b8", flex: 1 }}>{p}</span>
                <button
                  onClick={() => removePhrase(i)}
                  style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string, border: string) {
  return {
    fontSize: 12,
    padding: "4px 14px",
    background: bg,
    color,
    border: `1px solid ${border}`,
    borderRadius: 5,
    cursor: "pointer",
  };
}
