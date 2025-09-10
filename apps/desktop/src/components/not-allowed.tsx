export function NotAllowedClient() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-destructive/10 p-6">
      <div className="bg-destructive/40 text-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-lg">
          Your User Agent is not allowed to access this application.
        </p>
      </div>
    </div>
  );
}
