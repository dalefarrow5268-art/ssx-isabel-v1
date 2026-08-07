import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 25;

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const pastedText = String(form.get("pasted_text") || "").trim();
    const files = form.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);

    if (!pastedText && files.length === 0) {
      return NextResponse.json({ error: "Add an email or paste email content first." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Upload up to ${MAX_FILES} files at a time.` }, { status: 400 });
    }
    const tooLarge = files.find((f) => f.size > MAX_FILE_BYTES);
    if (tooLarge) {
      return NextResponse.json({ error: `${cleanName(tooLarge.name)} is larger than 50 MB.` }, { status: 413 });
    }

    const upstream = process.env.SSX_CONTACT_INTAKE_URL;
    const token = process.env.SSX_CONTACT_INTAKE_TOKEN;
    if (!upstream) {
      return NextResponse.json({
        error: "SSX intake backend is not connected yet. Set SSX_CONTACT_INTAKE_URL in Vercel."
      }, { status: 503 });
    }

    const outgoing = new FormData();
    outgoing.append("pasted_text", pastedText);
    outgoing.append("source", "ssx-contact-intake");
    outgoing.append("received_at", new Date().toISOString());
    for (const file of files) {
      outgoing.append("files", file, cleanName(file.name));
    }

    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(upstream, { method: "POST", headers, body: outgoing, cache: "no-store" });
    const raw = await response.text();
    let body: unknown = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = { message: raw.slice(0, 1000) }; }

    if (!response.ok) {
      console.error("SSX intake upstream failure", response.status, body);
      return NextResponse.json({ error: "The SSX processing server rejected the intake. Please retry." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, files: files.length, pasted: Boolean(pastedText), upstream: body });
  } catch (error) {
    console.error("SSX intake error", error);
    return NextResponse.json({ error: "Unable to process this intake right now. Please retry." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "SSX Contact Intake",
    connected: Boolean(process.env.SSX_CONTACT_INTAKE_URL)
  });
}
