import { NextResponse } from "next/server";
import { accounts, sanitizeAccount } from "../../../lib/accounts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const account = accounts[username];
    if (!account || account.password !== password) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: sanitizeAccount(username, account),
    });
  } catch (error) {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
