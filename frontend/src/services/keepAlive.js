const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Ping backend every 10 minutes to prevent Render free tier cold start
export function startKeepAlive() {
  const ping = () =>
    fetch(`${BACKEND_URL}/actuator/health`, { credentials: "include" }).catch(
      () => {}
    );

  ping(); // ping immediately on app load
  setInterval(ping, 10 * 60 * 1000); // then every 10 min
}
