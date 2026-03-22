import { NextRequest, NextResponse } from "next/server";
import { generateFullScaffold, type AppConfig } from "@/lib/app-generator";

export async function POST(request: NextRequest) {
  try {
    const config: AppConfig = await request.json();

    if (!config.name) return NextResponse.json({ error: "App name required" }, { status: 400 });
    if (!config.scopes?.length) return NextResponse.json({ error: "At least one scope required" }, { status: 400 });

    const scaffold = generateFullScaffold(config);
    return NextResponse.json(scaffold);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
