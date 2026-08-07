import type { NextApiRequest, NextApiResponse } from "next";

const DEFAULT_CONTACT_API_ORIGIN = "https://ssx-contact-system.mason-forge-ssx.workers.dev";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const origin = (process.env.SSX_CONTACT_API_ORIGIN || DEFAULT_CONTACT_API_ORIGIN).replace(/\/$/, "");
  const headers = new Headers();
  const contentType = req.headers["content-type"];
  const token = process.env.SSX_CONTACT_API_TOKEN;

  if (typeof contentType === "string") headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const workerResponse = await fetch(`${origin}/api/intake`, {
    method: "POST",
    headers,
    body: req as unknown as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  res.status(workerResponse.status);
  workerResponse.headers.forEach((value, key) => {
    if (!["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  const body = await workerResponse.arrayBuffer();
  res.send(Buffer.from(body));
}
