import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "ZUARY - Cut sharp.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#121416",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 168,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#F4F5F3",
          }}
        >
          <span>ZU</span>
          {/* The A, drawn as a triangle so no font file is needed for it. */}
          <div
            style={{
              width: 104,
              height: 94,
              margin: "0 10px",
              background: "#FF6B35",
              clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
            }}
          />
          <span>RY</span>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#FF6B35",
          }}
        >
          Cut sharp.
        </div>
      </div>
    ),
    size,
  );
}
