import { NextRequest, NextResponse } from "next/server";

const JUDGE0_API = "https://judge0-ce.p.rapidapi.com";

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
  typescript: 74,
  "c++": 54,
  java: 62,
  go: 60,
  rust: 73,
  c: 50,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, code, stdin } = body;

    if (!language || !code) {
      return NextResponse.json(
        { error: "Language and code are required" },
        { status: 400 }
      );
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    const pistonResult = await tryPiston(language, code, stdin);
    if (pistonResult) {
      return NextResponse.json(pistonResult);
    }

    const judge0Result = await tryJudge0Direct(languageId, code, stdin);
    if (judge0Result) {
      return NextResponse.json(judge0Result);
    }

    return NextResponse.json(
      { error: "All execution engines are unavailable. Please try again later." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Code execution error:", error);
    return NextResponse.json(
      { error: "Internal server error during code execution" },
      { status: 500 }
    );
  }
}


const PISTON_VERSIONS: Record<string, string> = {
  javascript: "18.15.0",
  python: "3.10.0",
  typescript: "5.0.3",
  "c++": "10.2.0",
  java: "15.0.2",
  go: "1.16.2",
  rust: "1.68.2",
  c: "10.2.0",
};

async function tryPiston(language: string, code: string, stdin?: string) {
  const pistonUrls = [
    "https://emkc.org/api/v2/piston/execute",
    "https://piston.pn.studio/api/v2/execute",
  ];

  for (const url of pistonUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          version: PISTON_VERSIONS[language] || "*",
          files: [{ name: "main", content: code }],
          stdin: stdin || "",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data.run) {
          return {
            stdout: data.run.stdout || "",
            stderr: data.run.stderr || "",
            compile_output: data.compile?.stderr || "",
            exit_code: data.run.code,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}


async function tryJudge0Direct(languageId: number, code: string, stdin?: string) {
  const judge0Urls = [
    "https://judge0-ce.p.sulu.sh",
    "https://ce.judge0.com",
  ];

  for (const baseUrl of judge0Urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: languageId,
          source_code: code,
          stdin: stdin || "",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return {
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          compile_output: data.compile_output || "",
          exit_code: data.exit_code ?? (data.status?.id === 3 ? 0 : 1),
          status: data.status?.description || "Unknown",
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
