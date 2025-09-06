import { getUser } from "@civic/auth-web3/nextjs";
import VerifierDashboard from "./verifier-dashboard";

export default async function VerifierDashboardPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            Access Denied
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Please log in to access the verifier dashboard.
          </p>
          <a href="/verifier/login" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%' }}>
              Go to Login
            </button>
          </a>
        </div>
      </div>
    );
  }

  return <VerifierDashboard user={user} />;
}