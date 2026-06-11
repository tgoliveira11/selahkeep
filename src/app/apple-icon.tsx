import { ImageResponse } from "next/og";
import { brandMarkDataUrl } from "@/lib/ui/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf8f5",
        }}
      >
        <img src={brandMarkDataUrl} alt="" width={180} height={180} />
      </div>
    ),
    size
  );
}
