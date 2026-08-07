const DEFAULT_CONTACT_API_ORIGIN = "https://ssx-contact-system.mason-forge-ssx.workers.dev";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = (process.env.SSX_CONTACT_API_ORIGIN || DEFAULT_CONTACT_API_ORIGIN).replace(/\/$/, "");
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const token = process.env.SSX_CONTACT_API_TOKEN;

  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`${origin}/api/intake`, {
    method: "POST",
    headers,
    body: request.body,
    // Required when forwarding a streaming request body from a Node runtime.
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const proxyHeaders = new Headers(response.headers);
  proxyHeaders.delete("content-encoding");
  proxyHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: proxyHeaders,
  });
}
