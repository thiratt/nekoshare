import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/index copy")({
  component: Home,
});

function Home() {
  return (
    <main className="h-screen flex flex-col justify-center items-center text-center px-4">
      <h1 className="text-2xl font-semibold mb-6">Select an interface</h1>
      <Navigation />
    </main>
  );
}

function Navigation() {
  return (
    <nav className="flex gap-4" aria-label="Main navigation">
      <Button asChild>
        <Link to="/desktop">Desktop</Link>
      </Button>
      <Button asChild>
        <Link to="/web">Website</Link>
      </Button>
      <Button asChild>
        <Link to="/auth/login">To Demo UI</Link>
      </Button>
    </nav>
  );
}
