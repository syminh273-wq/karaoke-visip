import type { Metadata } from "next";

// Own 404 page so it has a single <title> (Next's built-in one adds a second).
// Looks like the built-in page.
export const metadata: Metadata = {
  title: { absolute: "404: Không tìm thấy trang" },
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", height: "100vh", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div>
        <h1 style={{ display: "inline-block", margin: "0 20px 0 0", padding: "0 23px 0 0", fontSize: 24, fontWeight: 500, verticalAlign: "top", lineHeight: "49px", borderRight: "1px solid rgba(0,0,0,.3)" }}>404</h1>
        <div style={{ display: "inline-block" }}>
          <h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: "49px", margin: 0 }}>Không tìm thấy trang. <a href="/" style={{ color: "inherit" }}>Về trang chủ</a></h2>
        </div>
      </div>
    </div>
  );
}
