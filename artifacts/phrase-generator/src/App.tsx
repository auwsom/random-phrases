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
  "velvet","wandering","wild","winter","wolf","ancient","broken","burning","carved","chasing",
  "drifting","fallen","fleeting","forged","haunting","iron","lost","rising","rusted","silent",
  "stone","thunder","woven","arrow","atlas","beacon","blade","bridge","canyon","castle",
  "cavern","comet","compass","crater","creek","crown","dagger","delta","desert","domain",
  "drift","dusk","echo","falcon","flame","forest","gate","glacier","grove","harbor","hawk",
  "horizon","isle","keep","lake","lantern","legend","marsh","mesa","mine","mirror","moon",
  "mountain","nexus","oasis","orbit","passage","peak","pine","plain","prism","quarry",
  "quest","rain","range","reef","ridge","river","rune","saga","salt","sand","sea","shadow",
  "shore","signal","sky","spark","spire","spring","star","storm","summit","sun","surge",
  "swamp","sword","temple","tide","timber","torch","tower","trail","tundra","valley","vault",
  "veil","village","void","wave","well","wind","wood","world","zenith","zone"
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
  const [history, setHistory] = useState<string[]>([]);

  async function generate() {
    setLoading(true);
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
    if (phrase) navigator.clipboard.writeText(phrase);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 540, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Random Phrase Generator</h1>
      <p style={{ color: "#666", marginBottom: 28, fontSize: 14 }}>
        Uses true randomness from random.org (atmospheric noise).
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 14, color: "#444" }}>Words:</label>
        <input
          type="number"
          min={1}
          max={10}
          value={wordCount}
          onChange={(e) => setWordCount(Math.max(1, Math.min(10, Number(e.target.value))))}
          style={{ width: 60, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 }}
        />
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: "8px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {phrase && (
        <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "20px 24px", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.01em", marginBottom: 10 }}>
            {phrase}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={copy}
              style={{
                fontSize: 13,
                padding: "4px 12px",
                background: "#fff",
                border: "1px solid #cbd5e1",
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
            <span style={{ fontSize: 12, color: source === "random.org" ? "#16a34a" : "#d97706" }}>
              {source === "random.org" ? "✓ random.org" : "⚠ browser fallback"}
            </span>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Recent phrases</p>
          {history.slice(1).map((p, i) => (
            <div key={i} style={{ fontSize: 13, color: "#555", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
