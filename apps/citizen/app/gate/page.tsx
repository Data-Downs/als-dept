export const dynamic = "force-dynamic";

export default async function Gate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/agent";
  const error = sp.error === "1";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fbfaf7",
        color: "#0b0c0c",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        padding: "1.5rem",
      }}
    >
      <form
        method="POST"
        action="/api/gate"
        style={{
          width: "100%",
          maxWidth: "23rem",
          border: "1px solid rgba(11,12,12,0.12)",
          borderRadius: "16px",
          background: "#fff",
          padding: "2rem 1.75rem",
          boxShadow: "0 22px 48px -30px rgba(11,12,12,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "1.4rem" }}>
          <span
            style={{
              width: "1.05rem",
              height: "1.05rem",
              borderRadius: "50%",
              background: "#1d70b8",
              boxShadow: "0 0 0 3px rgba(29,112,184,0.22)",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>
            Agentic&nbsp;Government
          </span>
        </div>

        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.4rem", letterSpacing: "-0.02em" }}>
          A working prototype
        </h1>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.95rem", lineHeight: 1.5, color: "#4a4d4f" }}>
          This demo is shared privately for discussion. Enter the password to continue.
        </p>

        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>
          Password
        </label>
        <input
          name="password"
          type="password"
          autoFocus
          autoComplete="off"
          style={{
            width: "100%",
            fontSize: "1rem",
            padding: "0.7rem 0.85rem",
            borderRadius: "10px",
            border: error ? "1px solid #c05746" : "1px solid rgba(11,12,12,0.2)",
            outlineColor: "#1d70b8",
            background: "#fbfaf7",
          }}
        />
        <input type="hidden" name="next" value={next} />

        {error && (
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.85rem", color: "#c05746" }}>
            That password wasn&rsquo;t right. Try again.
          </p>
        )}

        <button
          type="submit"
          style={{
            marginTop: "1.4rem",
            width: "100%",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#fff",
            background: "#1d70b8",
            border: "none",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            cursor: "pointer",
          }}
        >
          Enter
        </button>

        <p style={{ margin: "1.4rem 0 0", fontSize: "0.72rem", letterSpacing: "0.04em", color: "#8a8a8a" }}>
          PROTOTYPE · FOR DISCUSSION
        </p>
      </form>
    </main>
  );
}
