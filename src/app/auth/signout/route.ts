import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  if (env.dataMode === "supabase") {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", new URL(req.url).origin));
}
