import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SCRIPTS_DIR = path.join(process.cwd(), "memory-scripts");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const category = searchParams.get("category") || "";
  const scope = searchParams.get("scope") || "";

  try {
    const args = [limit, offset, category, scope].filter(Boolean).join(" ");
    const result = execSync(`node ${SCRIPTS_DIR}/list.mjs ${args}`, {
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env },
      cwd: process.cwd(),
    });

    const data = JSON.parse(result);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to list memories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list memories", memories: [], total: 0 },
      { status: 500 }
    );
  }
}
