export default async (request, context) => {
  try {
    const url = new URL(request.url);

    const domain = Deno.env.get("AUTH0_DOMAIN");
    const clientId = Deno.env.get("AUTH0_CLIENT_ID");
    const redirectUri = Deno.env.get("AUTH0_REDIRECT_URI"); // <-- use env variable

    // 1. HANDLE CALLBACK FROM AUTH0
    if (url.searchParams.has("code")) {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/Dealer-Portal/",
          "Set-Cookie": "appSession=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600"
        }
      });
    }

    // 2. PROTECT /dealer-portal AND /order
    if (url.pathname.startsWith("/dealer-portal") || url.pathname.startsWith("/order")) {
      const hasSession = request.headers.get("cookie")?.includes("appSession=true");

      if (!hasSession) {
        const auth0Url = `https://${domain}/authorize?` +
          `response_type=code&` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=openid%20profile%20email`;
        
        return Response.redirect(auth0Url, 302);
      }
    }

    return;
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

export const config = { path: "/*" };
