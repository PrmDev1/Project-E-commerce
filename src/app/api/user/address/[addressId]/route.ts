import { NextRequest, NextResponse } from "next/server";
import { backendAuthRequest, readResponseBody } from "@/lib/auth/backend";

type Params = { params: Promise<{ addressId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { addressId } = await params;

  if (!addressId) {
    return NextResponse.json(
      { message: "Address ID is required" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const number = typeof input.number === "string" ? input.number.trim() : "";

  if (!name || !number) {
    return NextResponse.json(
      { message: "Recipient name and address line are required" },
      { status: 400 }
    );
  }

  const response = await backendAuthRequest(
    `/api/users/address/${addressId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name,
        number,
        province:
          typeof input.province === "string" ? input.province.trim() : "",
        district:
          typeof input.district === "string" ? input.district.trim() : "",
        locality:
          typeof input.locality === "string" ? input.locality.trim() : "",
        postCode:
          typeof input.postCode === "string" ? input.postCode.trim() : "",
        note: typeof input.note === "string" ? input.note.trim() : "",
      }),
    }
  );

  const { json } = await readResponseBody(response);

  return NextResponse.json(json ?? {}, { status: response.status });
}
