/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://qjojwsboebdzpyhgsmlv.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqb2p3c2JvZWJkenB5aGdzbWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDYwODMsImV4cCI6MjA5MDM4MjA4M30.riHUOkn0gBE4xW49N2WJAX_Kah6TtzhLUXDJz9g2C-w",
  },
  images: { unoptimized: true },
  optimizeFonts: false,
};
module.exports = nextConfig;
