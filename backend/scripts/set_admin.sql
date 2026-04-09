-- zebinisoisroilova03@gmail.com ni admin qilish
-- Supabase SQL Editor da ishga tushiring

UPDATE users
SET role = 'admin'
WHERE email = 'zebinisoisroilova03@gmail.com';

-- Tekshirish
SELECT id, email, role, credits FROM users WHERE email = 'zebinisoisroilova03@gmail.com';
