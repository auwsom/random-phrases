const OWNER = "auwsom";
const REPO = "random-phrases";
const FILE_PATH = "saved-phrases.txt";

export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "GITHUB_PAT not configured on server" }) };
  }

  const authHeaders = {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

  if (event.httpMethod === "GET") {
    const res = await fetch(apiUrl, { headers: authHeaders });

    if (res.status === 404) {
      return { statusCode: 200, headers, body: JSON.stringify({ phrases: [], sha: null }) };
    }
    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: `GitHub error: ${res.status}` }) };
    }

    const data = await res.json();
    const text = Buffer.from(data.content, "base64").toString("utf-8");
    const phrases = text.split("\n").map(l => l.trim()).filter(Boolean);
    return { statusCode: 200, headers, body: JSON.stringify({ phrases, sha: data.sha }) };
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { phrases, sha } = body;
    if (!Array.isArray(phrases)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "phrases array required" }) };
    }

    const content = Buffer.from(phrases.join("\n")).toString("base64");
    const payload = {
      message: `Update saved phrases (${phrases.length} phrase${phrases.length === 1 ? "" : "s"})`,
      content,
      ...(sha ? { sha } : {}),
    };

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = res.status === 403 ? "Rate limited — try again in a minute"
        : err.message ?? `GitHub error: ${res.status}`;
      return { statusCode: res.status, headers, body: JSON.stringify({ error: msg }) };
    }

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify({ sha: data.content.sha }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
