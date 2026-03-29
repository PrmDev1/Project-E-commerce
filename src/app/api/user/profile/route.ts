import { NextRequest, NextResponse } from "next/server";
import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  const { name, username } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { message: "Full name is required" },
      { status: 400 }
    );
  }
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json(
      { message: "Username is required" },
      { status: 400 }
    );
  }

  const response = await backendAuthRequest("/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name: name.trim(), username: username.trim() }),
  });

  const { json } = await readResponseBody(response);

  return NextResponse.json(json ?? {}, { status: response.status });
}
