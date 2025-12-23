// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  const url = new URL(request.url);
  const domain = Deno.env.get("AUTH0_DOMAIN");
  const clientId = Deno.env.get("AUTH0_CLIENT_ID");

  // 1. Handle Callback (Coming back from Auth0)
  if (url.searchParams.has("code")) {
    // Set cookie using the recommended 2025 Netlify context utility
    context.cookies.set({
      name: "appSession",
      value: "true",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 3600
    });

    // Use a fully qualified absolute URL to prevent doubling
    return Response.redirect("veusdealers.netlify.app", 302);
  }

  // 2. Protect Portal
  if (url.pathname.startsWith("/dealer-portal")) {
    const hasSession = context.cookies.get("appSession") === "true";

    if (!hasSession) {
      // MANDATORY: The redirectUri must match your Auth0 dashboard EXACTLY
      const redirectUri = "https://veusdealers.netlify.app/";
      
      const auth0Url = `https://${domain}/authorize?` + 
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=openid%20profile%20email`;
      
      // Forces the browser to go to Auth0 instead of your own doubled domain
      return Response.redirect(auth0Url, 302);
    }
  }

  return;
};

export const config = {
  path: "/*",
};
