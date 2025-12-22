// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  try {
    // Check if the Auth0 extension is active on this request
    const user = await context.auth0?.getUser();

    // If no user is logged in, redirect to the Auth0 login screen
    if (!user) {
      return context.auth0.loginRedirect();
    }

    // User is logged in, continue to the Eleventy page
    return; 
  } catch (error) {
    console.error("Auth0 Edge Function Error:", error);
    // Fallback: if there's a system error, redirect to home to prevent the "Crashed" screen
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }
};

export const config = {
  path: "/your-protected-page", // Replace with your actual Eleventy page path
};
