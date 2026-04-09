require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const EMAIL = "zebinisoisroilova03@gmail.com";

sb.from("users")
  .update({ role: "admin" })
  .eq("email", EMAIL)
  .select("id, email, role, credits")
  .then(({ data, error }) => {
    if (error) {
      console.log("XATO:", error.message);
    } else if (!data || data.length === 0) {
      console.log("Foydalanuvchi topilmadi.");
      console.log("Bu email hali ro'yxatdan o'tmagan bo'lishi mumkin.");
      console.log("Avval ilovaga kirsin, keyin qayta ishga tushiring.");
    } else {
      console.log("Admin qilindi:", data[0]);
    }
    process.exit(0);
  });
