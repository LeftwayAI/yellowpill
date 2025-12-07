import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Block in production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();
    
    const { data: posters, error } = await supabase
      .from("posters")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching posters:", error);
      return NextResponse.json({ error: "Failed to fetch posters" }, { status: 500 });
    }

    return NextResponse.json({ posters });
  } catch (error) {
    console.error("Admin posters error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

