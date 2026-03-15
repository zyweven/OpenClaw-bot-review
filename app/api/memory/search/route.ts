import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SCRIPTS_DIR = path.join(process.cwd(), "memory-scripts");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = searchParams.get("limit") || "20";
  const scope = searchParams.get("scope") || "";

  if (!query.trim()) {
    return NextResponse.json({ memories: [], query: "", total: 0 });
  }

  try {
    const escapedQuery = query.replace(/"/g, '\\"');
    const args = [`"${escapedQuery}"`, limit, scope].filter(Boolean).join(" ");
    const result = execSync(`node ${SCRIPTS_DIR}/search.mjs ${args}`, {
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env },
      cwd: process.cwd(),
    });

    const data = JSON.parse(result);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to search memories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search memories", memories: [], query, total: 0 },
      { status: 500 }
    );
  }
}
