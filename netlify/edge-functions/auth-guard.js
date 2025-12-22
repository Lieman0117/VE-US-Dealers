// netlify/edge-functions/auth-guard.js
export default async (request, context) => {
  // Check for a valid user session provided by the Auth0 extension
  const user = await context.auth0?.getUser(); 

  if (!user) {
    // Redirect unauthorized users to the Auth0 login page
    return context.auth0.loginRedirect();
  }

  // If logged in, allow them to see the Eleventy-generated page
  return;
};
