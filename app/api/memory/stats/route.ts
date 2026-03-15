import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SCRIPTS_DIR = path.join(process.cwd(), "memory-scripts");

export async function GET() {
  try {
    const result = execSync(`node ${SCRIPTS_DIR}/stats.mjs`, {
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env },
      cwd: process.cwd(),
    });

    const data = JSON.parse(result);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to get memory stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get memory stats", total: 0, byCategory: {}, byTier: {}, byScope: {} },
      { status: 500 }
    );
  }
}
