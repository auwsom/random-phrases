import { useState } from "react";

const API_KEY = "f59c1c83-f0d9-437b-8e8a-6ecd94fa7e3f";

const WORDS = [
  "amber","ancient","arctic","autumn","blazing","bright","calm","celestial","cobalt","cold",
  "cool","cosmic","crimson","crystal","dark","dawn","deep","drifting","electric","emerald",
  "fading","fierce","floating","frozen","gentle","glowing","golden","grand","grey","hidden",
  "hollow","humble","icy","iron","jade","jagged","keen","liquid","lone","loud","luminous",
  "misty","moonlit","mystic","narrow","neon","noble","ocean","old","pale","phantom","quiet",
  "rapid","raven","red","restless","rising","roaming","rough","royal","rugged","sacred",
  "scarlet","serene","sharp","silent","silver","sleek","slow","smoky","solar","solemn",
  "sonic","stark","still","storm","swift","thorned","tidal","timeless","twilight","vast",
  "velvet","wandering","wild","winter","wolf","broken","burning","carved","chasing",
  "fallen","fleeting","forged","haunting","lost","rusted","thunder","woven","arrow","atlas",
  "beacon","blade","bridge","canyon","castle","cavern","comet","compass","crater","creek",
  "crown","dagger","delta","desert","domain","drift","dusk","echo","falcon","flame","forest",
  "gate","glacier","grove","harbor","hawk","horizon","isle","keep","lake","lantern","legend",
  "marsh","mesa","mine","mirror","moon","mountain","nexus","oasis","orbit","passage","peak",
  "pine","plain","prism","quarry","quest","rain","range","reef","ridge","river","rune","saga",
  "salt","sand","sea","shadow","shore","signal","sky","spark","spire","spring","star","summit",
  "sun","surge","swamp","sword","temple","tide","timber","torch","tower","trail","tundra",
  "valley","vault","veil","village","void","wave","well","wind","wood","world","zenith","zone"
];

async function fetchRandomIndices(count: number, max: number): Promise<number[]> {
  const body = {
    jsonrpc: "2.0",
    method: "generateIntegers",
    params: { apiKey: API_KEY, n: count, min: 0, max: max - 1, replacement: true },
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

export default function App() {
  const [wordCount, setWordCount] = useState(3);
  const [phrase, setPhrase] = useState("");
  const [source, setSource] = useState<"random.org" | "browser" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  async function generate() {
    setLoading(true);
    setCopied(false);
    try {
      const indices = await fetchRandomIndices(wordCount, WORDS.length);
      const result = indices.map((i) => WORDS[i]).join(" ");
      setPhrase(result);
      setSource("random.org");
      setHistory((h) => [result, ...h].slice(0, 10));
    } catch {
      const indices = fallbackIndices(wordCount, WORDS.length);
      const result = indices.map((i) => WORDS[i]).join(" ");
      setPhrase(result);
      setSource("browser");
      setHistory((h) => [result, ...h].slice(0, 10));
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
      <div style={{ width: "100%", maxWidth: 520 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#f8fafc" }}>
          Random Phrase Generator
        </h1>
        <p style={{ color: "#64748b", marginBottom: 32, fontSize: 13 }}>
          True randomness via random.org atmospheric noise.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: "#94a3b8" }}>Words:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={wordCount}
            onChange={(e) => setWordCount(Math.max(1, Math.min(10, Number(e.target.value))))}
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
            disabled={loading}
            style={{
              padding: "8px 22px",
              background: loading ? "#1e3a8a" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {phrase && (
          <div style={{
            background: "#1a1f2e",
            border: "1px solid #2d3548",
            borderRadius: 10,
            padding: "20px 22px",
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 21, fontWeight: 600, color: "#f1f5f9", letterSpacing: "0.01em", marginBottom: 14, lineHeight: 1.4 }}>
              {phrase}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={copy}
                style={{
                  fontSize: 12,
                  padding: "4px 14px",
                  background: copied ? "#166534" : "#1e2330",
                  color: copied ? "#86efac" : "#94a3b8",
                  border: "1px solid " + (copied ? "#166534" : "#2d3548"),
                  borderRadius: 5,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <span style={{ fontSize: 12, color: source === "random.org" ? "#4ade80" : "#fbbf24" }}>
                {source === "random.org" ? "✓ random.org" : "⚠ browser fallback"}
              </span>
            </div>
          </div>
        )}

        {history.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Recent
            </p>
            {history.slice(1).map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  padding: "6px 0",
                  borderBottom: "1px solid #1e2330",
                  cursor: "pointer",
                }}
                onClick={() => { setPhrase(p); setCopied(false); }}
                title="Click to restore"
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
