import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
  const { supabase } = await import("./lib/supabase");

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .limit(5);

  if (error) {
    console.error("SUPABASE ERROR:", error);
    process.exit(1);
  }

  console.log("SUPABASE CONNECTED");
  console.log("TEAMS:", data);
}

test();