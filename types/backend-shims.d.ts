// The mirrored backend in convex/ imports server-only packages the app never
// installs. These stubs keep the app's type-check quiet about them.
declare module "web-push" {
  class WebPushError extends Error {
    statusCode: number;
  }
  const webpush: {
    WebPushError: typeof WebPushError;
    setVapidDetails: (...args: unknown[]) => void;
    sendNotification: (...args: unknown[]) => Promise<{ statusCode: number }>;
  };
  export default webpush;
}
