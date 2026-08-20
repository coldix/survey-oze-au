interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  EMAIL?: {
    send: (message: {
      to: string;
      from: { email: string; name?: string };
      subject: string;
      html: string;
      text: string;
    }) => Promise<{ messageId?: string }>;
  };
  ADMIN_EMAILS?: string;
  ADMIN_SESSION_SECRET?: string;
}
