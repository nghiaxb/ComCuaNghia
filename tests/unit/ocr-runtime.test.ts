import { it, expect } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
async function runtime(upstream: () => Response) {
  const output = await build({
    stdin: {
      contents: `import {requestOcr} from "./worker/ocr"; export default {async fetch(){try {return Response.json(await requestOcr("https://ocr.test", "test-key", {imageBase64:"test-image",mimeType:"image/png"}));}catch(e){return Response.json({message:e.message},{status:503});}}};`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
  });
  return new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: output.outputFiles[0].text,
      compatibilityDate: "2026-10-02",
      compatibilityFlags: ["global_fetch_strictly_public"],
      cf: false,
      outboundService: async () => upstream(),
    }),
  );
}
it("executes the OCR request with Cloudflare's actual fetch runtime", async () => {
  const mf = await runtime(() =>
    Response.json({
      success: true,
      data: { menu: [{ day: "Thứ 2", foods: ["Cơm"] }] },
    }),
  );
  try {
    const response = await mf.dispatchFetch("http://localhost/");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ menu: [{ day: "Thứ 2" }] });
  } finally {
    await mf.dispose();
  }
}, 15000);
it("rejects provider redirects in Cloudflare's actual runtime", async () => {
  let calls = 0;
  const mf = await runtime(() => {
    calls++;
    return new Response(null, {
      status: 307,
      headers: { Location: "https://other.test" },
    });
  });
  try {
    const response = await mf.dispatchFetch("http://localhost/");
    expect(response.status).toBe(503);
    expect(calls).toBe(1);
  } finally {
    await mf.dispose();
  }
}, 15000);
