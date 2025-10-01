export function getAuthErrorMessage(error: string | null | undefined): string {
  if (!error) return "An unknown error occurred";
  
  switch (error) {
    case "CredentialsSignin":
      return "Invalid email/username or password. Please check your credentials and try again.";
    case "OAuthSignin":
      return "Failed to sign in with the selected provider. Please try again.";
    case "OAuthCallback":
      return "There was an error with the authentication provider. Please try again.";
    case "OAuthCreateAccount":
      return "Could not create account with the authentication provider.";
    case "EmailCreateAccount":
      return "Could not create account with email. The email might already be in use.";
    case "Callback":
      return "Authentication callback error. Please try signing in again.";
    case "OAuthAccountNotLinked":
      return "This account is already linked to another provider. Please sign in with your original method.";
    case "EmailSignin":
      return "Failed to send email verification. Please check your email address.";
    case "CredentialsCallback":
      return "Invalid credentials provided. Please check your information and try again.";
    case "SessionRequired":
      return "You must be signed in to access this page.";
    case "Default":
      return "An authentication error occurred. Please try again.";
    case "Configuration":
      return "There is a problem with the authentication configuration. Please contact support.";
    case "AccessDenied":
      return "Access denied. You don't have permission to sign in.";
    case "Verification":
      return "The verification link is invalid or has expired. Please request a new one.";
    case "NOT_FOUND":
      return "No account found with these credentials. Please sign up first or check your information.";
    default:
      // For any other error, try to make it more user-friendly
      if (error.toLowerCase().includes("password")) {
        return "Invalid password. Please check your password and try again.";
      }
      if (error.toLowerCase().includes("email")) {
        return "Invalid email address. Please check your email and try again.";
      }
      if (error.toLowerCase().includes("username")) {
        return "Invalid username. Please check your username and try again.";
      }
      if (error.toLowerCase().includes("user not found")) {
        return "No account found with these credentials. Please sign up first.";
      }
      if (error.toLowerCase().includes("invalid")) {
        return "Invalid credentials. Please check your information and try again.";
      }
      
      // Return the original error if we can't map it, but make it more presentable
      return error.charAt(0).toUpperCase() + error.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }
}