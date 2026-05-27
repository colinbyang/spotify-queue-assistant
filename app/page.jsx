import { isAuthenticated } from "@/lib/auth";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const authed = await isAuthenticated();

  if (!authed) {
    return <LoginScreen error={params?.error} />;
  }

  return <Dashboard />;
}
