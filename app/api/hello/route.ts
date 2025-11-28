// app/api/hello.route.ts
import { NextRequest, NextResponse } from "next/server";

const test = process.env.test

export function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Hello from TypeScript API" + test,
  });
}
