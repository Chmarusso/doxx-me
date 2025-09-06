import { getUser } from "@civic/auth-web3/nextjs";
import { redirect } from "next/navigation";

export default async function VerifierHomePage() {
  const user = await getUser();
  
  if (user) {
    // If user is logged in, redirect to dashboard
    redirect('/verifier/dashboard');
  } else {
    // If not logged in, redirect to login
    redirect('/verifier/login');
  }
}