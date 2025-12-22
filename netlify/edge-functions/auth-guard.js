// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  const domain = Netlify.env.get("AUTH0_DOMAIN");
  const clientId = Netlify.env.get("AUTH0_CLIENT_ID");

  // 1. HANDLE CALLBACK: If user just logged in and is arriving at homepage
  if (url.searchParams.has("code") && url.pathname === "/") {
    const response = Response.redirect(new URL("/dealer-portal", request.url), 302);
    // Set a simple session cookie to remember they are logged in
    response.headers.append("Set-Cookie", "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600");
    return response;
  }

  // 2. PROTECT PORTAL: Check if visiting the dealer portal
  if (url.pathname.startsWith("/dealer-portal")) {
    const hasSession = request.headers.get("cookie")?.includes("appSession=true");

    if (!hasSession) {
      const redirectUri = "veusdealers.netlify.app"; 
      const auth0LoginUrl = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
      return Response.redirect(auth0LoginUrl, 302);
    }
  }

  // Allow all other requests (like the homepage itself)
  return;
};

export const config = {
  path: "/*", // Run on all paths so it can catch the callback on the homepage
};
