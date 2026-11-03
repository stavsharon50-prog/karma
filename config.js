// KARMA. connection settings.
// Fill these two values from Supabase: Project Settings → API.
// Both are safe to publish: the anon key only allows what the database rules allow.
// While they are empty the app runs in demo mode with fake friends and nothing is saved to a server.
window.KARMA_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
