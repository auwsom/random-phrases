export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "GITHUB_PAT not configured on server" }) };
  }

  let phrases;
  try {
    ({ phrases } = JSON.parse(event.body ?? "{}"));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!Array.isArray(phrases) || phrases.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "phrases array required" }) };
  }

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
        "phrases.txt": { content: phrases.join("\n") },
      },
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const msg = status === 403 ? "Rate limited — try again in a minute" : `GitHub API error: ${status}`;
    return { statusCode: status, headers, body: JSON.stringify({ error: msg }) };
  }

  const data = await res.json();
  return { statusCode: 200, headers, body: JSON.stringify({ url: data.html_url }) };
};
