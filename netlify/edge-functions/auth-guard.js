// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  const domain = Netlify.env.get("AUTH0_DOMAIN");
  const clientId = Netlify.env.get("AUTH0_CLIENT_ID");

  // A. HANDLE CALLBACK: When returning from Auth0 with a ?code=
  if (url.searchParams.has("code")) {
    const response = Response.redirect(new URL("/dealer-portal", request.url), 302);
    // This cookie is what tells the browser "you are logged in"
    response.headers.append("Set-Cookie", "appSession=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600");
    return response;
  }

  // B. PROTECT PORTAL: Check if visiting the dealer portal
  if (url.pathname.startsWith("/dealer-portal")) {
    const hasSession = request.headers.get("cookie")?.includes("appSession=true");

    if (!hasSession) {
      // FIX: Ensure this matches your Auth0 dashboard EXACTLY
      const redirectUri = "veusdealers.netlify.app"; 
      const auth0LoginUrl = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
      
      return Response.redirect(auth0LoginUrl, 302);
    }
  }

  return;
};

export const config = {
  path: "/*", 
};
