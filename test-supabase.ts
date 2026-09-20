import { supabase } from "./lib/supabase";

async function test() {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .limit(5);

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

test();
