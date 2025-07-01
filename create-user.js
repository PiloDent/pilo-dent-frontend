// create-user.node.js
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("⚠️  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.post("/", async (req, res) => {
  const { email, password, full_name, role, company_id } = req.body;
  if (!email || !password || !full_name || !role || !company_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data: user, error: signUpError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (signUpError) {
    return res.status(400).json({ error: signUpError.message });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    full_name,
    role,
    company_id,
  });
  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }

  res.json({ message: "User created successfully", user_id: user.id });
});

// Start listening on port 8080
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 create-user service listening on http://localhost:${port}`);
});
