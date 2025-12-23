// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  const domain = Netlify.env.get("AUTH0_DOMAIN");
  const clientId = Netlify.env.get("AUTH0_CLIENT_ID");

  // 1. Handle return from Auth0 (The "Callback")
  if (url.searchParams.has("code")) {
    const response = Response.redirect(new URL("/dealer-portal", request.url), 302);
    // Set cookie to remember user is logged in
    response.headers.append("Set-Cookie", "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600");
    return response;
  }

  // 2. Protect the /dealer-portal path
  if (url.pathname.startsWith("/dealer-portal")) {
    const hasSession = request.headers.get("cookie")?.includes("appSession=true");

    if (!hasSession) {
      // THE FIX: This MUST match your Auth0 dashboard exactly (including https and /)
      const redirectUri = "veusdealers.netlify.app"; 
      
      const auth0Url = `https://${domain}/authorize?` + 
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=openid%20profile%20email`;
      
      return Response.redirect(auth0Url, 302);
    }
  }

  return;
};

export const config = {
  path: "/*",
};
