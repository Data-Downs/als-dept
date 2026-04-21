const PASSWORD = "legibility2026";

const LOGIN_PAGE = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in — Agentic Legibility Stack</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script async defer src="https://scripts.withcabin.com/hello.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", Arial, sans-serif;
      background: #f3f2f1;
      color: #0b0c0c;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #fff;
      border: 1px solid #b1b4b6;
      border-radius: 2px;
      padding: 2.5rem;
      max-width: 400px;
      width: 100%;
      margin: 1rem;
    }
    .label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #505a5f; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.9rem; color: #505a5f; margin-bottom: 1.5rem; }
    input {
      width: 100%;
      padding: 0.65rem 0.75rem;
      font-size: 1rem;
      font-family: inherit;
      border: 2px solid #0b0c0c;
      border-radius: 0;
      margin-bottom: 1rem;
      outline: none;
    }
    input:focus { border-color: #1d70b8; box-shadow: 0 0 0 3px rgba(29,112,184,0.25); }
    button {
      background: #0b0c0c;
      color: #fff;
      border: none;
      padding: 0.65rem 1.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      width: 100%;
    }
    button:hover { background: #1d70b8; }
    .error { color: #d4351c; font-size: 0.85rem; margin-bottom: 1rem; display: none; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="label">Agentic Legibility Stack</div>
    <h1>Documentation</h1>
    <p>Enter the password to continue.</p>
    <div class="error" id="error">Incorrect password. Please try again.</div>
    <form method="POST">
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" />
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`;

const ERROR_LOGIN_PAGE = LOGIN_PAGE.replace(
  'class="error"',
  'class="error show"'
);

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // Allow static assets through without auth
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(url.pathname)) {
    return context.next();
  }

  // Handle POST (password submission)
  if (request.method === "POST") {
    const formData = await request.formData();
    const password = formData.get("password");

    if (password === PASSWORD) {
      const response = new Response(null, {
        status: 302,
        headers: { Location: url.pathname || "/" },
      });
      // Set a cookie that lasts 30 days
      response.headers.set(
        "Set-Cookie",
        `als_auth=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
      );
      return response;
    }

    return new Response(ERROR_LOGIN_PAGE, {
      status: 401,
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }

  // Check cookie
  const cookie = request.headers.get("Cookie") || "";
  if (cookie.includes("als_auth=1")) {
    return context.next();
  }

  // Show login page
  return new Response(LOGIN_PAGE, {
    status: 401,
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
};
