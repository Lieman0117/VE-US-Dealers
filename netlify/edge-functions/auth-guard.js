// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  // Use the context provided by the Auth0 extension automatically
  const { auth0 } = context;

  if (!auth0) {
    console.error("Auth0 extension not found in context. Check extension link.");
    return new Response("Auth0 Extension Error", { status: 500 });
  }

  try {
    const user = await auth0.getUser();

    if (!user) {
      // If no user session, redirect to the Auth0-hosted login page
      return auth0.loginRedirect();
    }

    // Authenticated: allow access to /dealer-portal
    return;
  } catch (error) {
    console.error("Auth0 Guard Error:", error);
    return new Response("Authentication Error", { status: 500 });
  }
};

export const config = {
  path: "/dealer-portal",
};
