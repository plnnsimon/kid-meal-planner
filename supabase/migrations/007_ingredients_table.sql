-- 007_ingredients_table.sql

-- ─── 1. ingredients table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  name_uk           TEXT,
  category          TEXT        NOT NULL CHECK (category IN ('produce','dairy','meat','pantry','bakery','frozen','beverages','other')),
  source            TEXT        NOT NULL DEFAULT 'system' CHECK (source IN ('system','user')),
  user_id           UUID        REFERENCES auth.users ON DELETE CASCADE,
  calories_per_100g FLOAT,
  protein_per_100g  FLOAT,
  carbs_per_100g    FLOAT,
  fat_per_100g      FLOAT,
  fiber_per_100g    FLOAT,
  sugar_per_100g    FLOAT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. junction table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_tasted_ingredients (
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  ingredient_id    UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (child_profile_id, ingredient_id)
);

-- ─── 3. Seed system ingredients ───────────────────────────────────────────────
INSERT INTO ingredients (name, name_uk, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, source)
VALUES
  ('Broccoli', 'Броколі', 'produce', 34, 2.82, 6.64, 0.37, 2.6, 1.7, 'system'),
  ('Carrot', 'Морква', 'produce', 41, 0.93, 9.58, 0.24, 2.8, 4.74, 'system'),
  ('Spinach', 'Шпинат', 'produce', 23, 2.86, 3.63, 0.39, 2.2, 0.42, 'system'),
  ('Tomato', 'Помідор', 'produce', 18, 0.88, 3.89, 0.2, 1.2, 2.63, 'system'),
  ('Potato', 'Картопля', 'produce', 77, 2.02, 17.47, 0.09, 2.2, 0.78, 'system'),
  ('Sweet Potato', 'Батат', 'produce', 86, 1.57, 20.12, 0.05, 3.0, 4.18, 'system'),
  ('Onion', 'Цибуля', 'produce', 40, 1.1, 9.34, 0.1, 1.7, 4.24, 'system'),
  ('Garlic', 'Часник', 'produce', 149, 6.36, 33.06, 0.5, 2.1, 1.0, 'system'),
  ('Bell Pepper (Red)', 'Болгарський перець (червоний)', 'produce', 31, 0.99, 6.03, 0.3, 2.1, 4.2, 'system'),
  ('Bell Pepper (Green)', 'Болгарський перець (зелений)', 'produce', 20, 0.86, 4.64, 0.17, 1.7, 2.4, 'system'),
  ('Bell Pepper (Yellow)', 'Болгарський перець (жовтий)', 'produce', 27, 1.0, 6.32, 0.21, 0.9, 5.0, 'system'),
  ('Cucumber', 'Огірок', 'produce', 15, 0.65, 3.63, 0.11, 0.5, 1.67, 'system'),
  ('Zucchini', 'Кабачок', 'produce', 17, 1.21, 3.11, 0.32, 1.0, 2.5, 'system'),
  ('Cauliflower', 'Цвітна капуста', 'produce', 25, 1.92, 4.97, 0.28, 2.0, 1.91, 'system'),
  ('Cabbage', 'Капуста', 'produce', 25, 1.28, 5.8, 0.1, 2.5, 3.2, 'system'),
  ('Romaine Lettuce', 'Салат романо', 'produce', 17, 1.23, 3.29, 0.3, 2.1, 1.19, 'system'),
  ('Celery', 'Селера', 'produce', 16, 0.69, 2.97, 0.17, 1.6, 1.34, 'system'),
  ('Green Peas', 'Зелений горошок', 'produce', 81, 5.42, 14.45, 0.4, 5.1, 5.67, 'system'),
  ('Corn', 'Кукурудза', 'produce', 86, 3.27, 18.7, 1.35, 2.0, 3.22, 'system'),
  ('Eggplant', 'Баклажан', 'produce', 25, 0.98, 5.88, 0.18, 3.0, 3.53, 'system'),
  ('Mushrooms', 'Гриби', 'produce', 22, 3.09, 3.26, 0.34, 1.0, 1.98, 'system'),
  ('Asparagus', 'Спаржа', 'produce', 20, 2.2, 3.88, 0.12, 2.1, 1.88, 'system'),
  ('Beets', 'Буряк', 'produce', 43, 1.61, 9.56, 0.17, 2.8, 6.76, 'system'),
  ('Kale', 'Кейл', 'produce', 49, 4.28, 8.75, 0.93, 3.6, 2.26, 'system'),
  ('Brussels Sprouts', 'Брюссельська капуста', 'produce', 43, 3.38, 8.95, 0.3, 3.8, 2.2, 'system'),
  ('Leek', 'Цибуля-порей', 'produce', 61, 1.5, 14.15, 0.3, 1.8, 3.9, 'system'),
  ('Pumpkin', 'Гарбуз', 'produce', 26, 1.0, 6.5, 0.1, 0.5, 2.76, 'system'),
  ('Green Beans', 'Стручкова квасоля', 'produce', 31, 1.83, 6.97, 0.22, 2.7, 3.26, 'system'),
  ('Radish', 'Редиска', 'produce', 16, 0.68, 3.4, 0.1, 1.6, 1.86, 'system'),
  ('Artichoke', 'Артишок', 'produce', 47, 3.27, 10.51, 0.15, 5.4, 0.99, 'system'),
  ('Parsnip', 'Пастернак', 'produce', 75, 1.2, 17.99, 0.3, 4.9, 4.8, 'system'),
  ('Turnip', 'Ріпа', 'produce', 28, 0.9, 6.43, 0.1, 1.8, 3.8, 'system'),
  ('Apple', 'Яблуко', 'produce', 52, 0.26, 13.81, 0.17, 2.4, 10.39, 'system'),
  ('Banana', 'Банан', 'produce', 89, 1.09, 22.84, 0.33, 2.6, 12.23, 'system'),
  ('Orange', 'Апельсин', 'produce', 47, 0.94, 11.75, 0.12, 2.4, 9.35, 'system'),
  ('Strawberry', 'Полуниця', 'produce', 32, 0.67, 7.68, 0.3, 2.0, 4.89, 'system'),
  ('Blueberry', 'Чорниця', 'produce', 57, 0.74, 14.49, 0.33, 2.4, 9.96, 'system'),
  ('Grape', 'Виноград', 'produce', 69, 0.72, 18.1, 0.16, 0.9, 15.48, 'system'),
  ('Watermelon', 'Кавун', 'produce', 30, 0.61, 7.55, 0.15, 0.4, 6.2, 'system'),
  ('Pear', 'Груша', 'produce', 57, 0.36, 15.23, 0.14, 3.1, 9.75, 'system'),
  ('Peach', 'Персик', 'produce', 39, 0.91, 9.54, 0.25, 1.5, 8.39, 'system'),
  ('Mango', 'Манго', 'produce', 60, 0.82, 14.98, 0.38, 1.6, 13.66, 'system'),
  ('Pineapple', 'Ананас', 'produce', 50, 0.54, 13.12, 0.12, 1.4, 9.85, 'system'),
  ('Kiwi', 'Ківі', 'produce', 61, 1.14, 14.66, 0.52, 3.0, 8.99, 'system'),
  ('Avocado', 'Авокадо', 'produce', 160, 2.0, 8.53, 14.66, 6.7, 0.66, 'system'),
  ('Cherry', 'Черешня', 'produce', 63, 1.06, 16.01, 0.2, 2.1, 12.82, 'system'),
  ('Plum', 'Слива', 'produce', 46, 0.7, 11.42, 0.28, 1.4, 9.92, 'system'),
  ('Raspberry', 'Малина', 'produce', 52, 1.2, 11.94, 0.65, 6.5, 4.42, 'system'),
  ('Blackberry', 'Ожина', 'produce', 43, 1.39, 9.61, 0.49, 5.3, 4.88, 'system'),
  ('Papaya', 'Папая', 'produce', 43, 0.47, 10.82, 0.26, 1.7, 7.82, 'system'),
  ('Melon', 'Диня', 'produce', 34, 0.84, 8.16, 0.19, 0.9, 7.86, 'system'),
  ('Lemon', 'Лимон', 'produce', 29, 1.1, 9.32, 0.3, 2.8, 2.5, 'system'),
  ('Lime', 'Лайм', 'produce', 30, 0.7, 10.54, 0.2, 2.8, 1.69, 'system'),
  ('Pomegranate', 'Гранат', 'produce', 83, 1.67, 18.7, 1.17, 4.0, 13.67, 'system'),
  ('Apricot', 'Абрикос', 'produce', 48, 1.4, 11.12, 0.39, 2.0, 9.24, 'system'),
  ('Chicken Breast', 'Куряча грудка', 'meat', 120, 22.5, 0, 2.62, 0, 0, 'system'),
  ('Chicken Thigh', 'Куряче стегно', 'meat', 177, 18.34, 0, 11.1, 0, 0, 'system'),
  ('Ground Beef', 'Яловичий фарш', 'meat', 254, 17.17, 0, 20.0, 0, 0, 'system'),
  ('Beef Sirloin', 'Яловичина (вирізка)', 'meat', 207, 21.41, 0, 13.18, 0, 0, 'system'),
  ('Pork Tenderloin', 'Свинина (вирізка)', 'meat', 143, 21.02, 0, 5.79, 0, 0, 'system'),
  ('Ground Turkey', 'Фарш з індички', 'meat', 163, 19.67, 0, 9.02, 0, 0, 'system'),
  ('Salmon', 'Лосось', 'meat', 208, 20.42, 0, 13.42, 0, 0, 'system'),
  ('Tuna', 'Тунець', 'meat', 144, 23.33, 0, 4.9, 0, 0, 'system'),
  ('Shrimp', 'Креветки', 'meat', 99, 18.98, 0.18, 1.78, 0, 0, 'system'),
  ('Cod', 'Тріска', 'meat', 82, 17.81, 0, 0.67, 0, 0, 'system'),
  ('Tilapia', 'Тилапія', 'meat', 96, 20.08, 0, 1.7, 0, 0, 'system'),
  ('Lamb', 'Баранина', 'meat', 294, 16.56, 0, 25.0, 0, 0, 'system'),
  ('Egg', 'Яйце', 'dairy', 155, 12.56, 1.12, 10.61, 0, 1.12, 'system'),
  ('Egg White', 'Білок яйця', 'dairy', 52, 10.9, 0.73, 0.17, 0, 0.73, 'system'),
  ('Whole Milk', 'Молоко (цільне)', 'dairy', 61, 3.15, 4.8, 3.25, 0, 5.05, 'system'),
  ('Skim Milk', 'Молоко (знежирене)', 'dairy', 34, 3.37, 4.96, 0.08, 0, 4.96, 'system'),
  ('Greek Yogurt', 'Грецький йогурт', 'dairy', 59, 10.19, 3.6, 0.39, 0, 3.24, 'system'),
  ('Cheddar Cheese', 'Сир чеддер', 'dairy', 402, 24.9, 1.28, 33.14, 0, 0.52, 'system'),
  ('Mozzarella', 'Моцарела', 'dairy', 280, 19.42, 2.19, 21.6, 0, 1.03, 'system'),
  ('Parmesan', 'Пармезан', 'dairy', 431, 38.46, 4.06, 28.61, 0, 0.85, 'system'),
  ('Butter', 'Вершкове масло', 'dairy', 717, 0.85, 0.06, 81.11, 0, 0.06, 'system'),
  ('Heavy Cream', 'Жирні вершки', 'dairy', 340, 2.05, 2.79, 36.08, 0, 2.79, 'system'),
  ('Sour Cream', 'Сметана', 'dairy', 198, 2.44, 4.63, 19.35, 0, 0.1, 'system'),
  ('Cottage Cheese', 'Сир кисломолочний', 'dairy', 98, 11.12, 3.38, 4.3, 0, 2.67, 'system'),
  ('Cream Cheese', 'Вершковий сир', 'dairy', 342, 5.93, 4.07, 33.99, 0, 3.21, 'system'),
  ('White Rice', 'Білий рис', 'pantry', 365, 7.13, 79.95, 0.66, 1.3, 0.12, 'system'),
  ('Brown Rice', 'Коричневий рис', 'pantry', 370, 7.94, 77.24, 2.92, 3.5, 0.85, 'system'),
  ('Pasta', 'Паста', 'pantry', 371, 13.04, 74.67, 1.51, 3.2, 2.67, 'system'),
  ('Rolled Oats', 'Вівсяні пластівці', 'pantry', 389, 16.89, 66.27, 6.9, 10.6, 0, 'system'),
  ('Quinoa', 'Кіноа', 'pantry', 368, 14.12, 64.16, 6.07, 7.0, 0, 'system'),
  ('All-Purpose Flour', 'Борошно пшеничне', 'pantry', 364, 10.33, 76.31, 0.98, 2.7, 0.27, 'system'),
  ('Whole Wheat Flour', 'Борошно цільнозернове', 'pantry', 340, 13.7, 72.57, 1.87, 10.7, 0.41, 'system'),
  ('Bulgur', 'Булгур', 'pantry', 342, 12.29, 75.87, 1.33, 18.3, 0.41, 'system'),
  ('Couscous', 'Кускус', 'pantry', 376, 12.76, 77.43, 0.64, 5.0, 0, 'system'),
  ('Lentils', 'Сочевиця', 'pantry', 352, 25.8, 60.08, 1.06, 30.5, 2.03, 'system'),
  ('Chickpeas', 'Нут', 'pantry', 378, 20.47, 62.95, 6.04, 17.4, 10.7, 'system'),
  ('Black Beans', 'Чорна квасоля', 'pantry', 341, 21.6, 62.36, 1.42, 15.5, 2.12, 'system'),
  ('Kidney Beans', 'Квасоля', 'pantry', 337, 22.53, 61.29, 0.85, 24.9, 2.2, 'system'),
  ('Cornmeal', 'Кукурудзяне борошно', 'pantry', 362, 8.12, 76.85, 3.59, 7.3, 0.64, 'system'),
  ('Barley', 'Ячмінь', 'pantry', 354, 12.48, 73.48, 2.3, 17.3, 0.8, 'system'),
  ('Olive Oil', 'Оливкова олія', 'pantry', 884, 0, 0, 100, 0, 0, 'system'),
  ('Vegetable Oil', 'Рослинна олія', 'pantry', 884, 0, 0, 100, 0, 0, 'system'),
  ('Coconut Oil', 'Кокосова олія', 'pantry', 892, 0, 0, 99.06, 0, 0, 'system'),
  ('Honey', 'Мед', 'pantry', 304, 0.3, 82.4, 0, 0.2, 82.12, 'system'),
  ('Maple Syrup', 'Кленовий сироп', 'pantry', 260, 0.04, 67.04, 0.06, 0, 60.46, 'system'),
  ('Soy Sauce', 'Соєвий соус', 'pantry', 60, 5.06, 5.57, 0.1, 0.8, 1.7, 'system'),
  ('Tomato Paste', 'Томатна паста', 'pantry', 82, 4.32, 18.91, 0.47, 4.1, 11.64, 'system'),
  ('Apple Cider Vinegar', 'Яблучний оцет', 'pantry', 21, 0, 0.93, 0, 0, 0.4, 'system'),
  ('Sugar', 'Цукор', 'pantry', 387, 0, 99.98, 0, 0, 99.98, 'system'),
  ('Brown Sugar', 'Коричневий цукор', 'pantry', 380, 0.12, 98.09, 0, 0, 97.02, 'system'),
  ('Salt', 'Сіль', 'pantry', 0, 0, 0, 0, 0, 0, 'system'),
  ('Black Pepper', 'Чорний перець', 'pantry', 255, 10.95, 63.95, 3.26, 25.3, 0.64, 'system'),
  ('Cinnamon', 'Кориця', 'pantry', 247, 3.99, 80.59, 1.24, 53.1, 2.17, 'system'),
  ('Paprika', 'Паприка', 'pantry', 282, 14.14, 53.99, 12.89, 34.9, 10.34, 'system'),
  ('Cumin', 'Кмин', 'pantry', 375, 17.81, 44.24, 22.27, 10.5, 2.25, 'system'),
  ('Turmeric', 'Куркума', 'pantry', 312, 9.68, 67.14, 3.25, 22.7, 3.21, 'system'),
  ('Almonds', 'Мигдаль', 'pantry', 579, 21.15, 21.55, 49.93, 12.5, 4.35, 'system'),
  ('Walnuts', 'Волоські горіхи', 'pantry', 654, 15.23, 13.71, 65.21, 6.7, 2.61, 'system'),
  ('Cashews', 'Кешʼю', 'pantry', 553, 18.22, 30.19, 43.85, 3.3, 5.91, 'system'),
  ('Peanuts', 'Арахіс', 'pantry', 567, 25.8, 16.13, 49.24, 8.5, 3.97, 'system'),
  ('Peanut Butter', 'Арахісова паста', 'pantry', 588, 25.09, 19.56, 50.39, 6.0, 10.49, 'system'),
  ('Sunflower Seeds', 'Насіння соняшника', 'pantry', 584, 20.78, 20.0, 51.46, 8.6, 2.62, 'system'),
  ('Pumpkin Seeds', 'Гарбузове насіння', 'pantry', 559, 30.23, 10.71, 49.05, 6.0, 1.4, 'system'),
  ('Chia Seeds', 'Насіння чіа', 'pantry', 486, 16.54, 42.12, 30.74, 34.4, 0, 'system'),
  ('Flaxseeds', 'Насіння льону', 'pantry', 534, 18.29, 28.88, 42.16, 27.3, 1.55, 'system'),
  ('Sesame Seeds', 'Насіння кунжуту', 'pantry', 573, 17.73, 23.45, 49.67, 11.8, 0.3, 'system'),
  ('Bread (White)', 'Хліб білий', 'bakery', 265, 9.43, 49.24, 3.2, 2.7, 5.34, 'system'),
  ('Bread (Whole Wheat)', 'Хліб цільнозерновий', 'bakery', 247, 12.45, 43.38, 3.54, 6.8, 5.74, 'system')
ON CONFLICT DO NOTHING;

-- ─── 4. Migrate existing tasted_ingredients TEXT[] → junction table ───────────
INSERT INTO child_tasted_ingredients (child_profile_id, ingredient_id)
SELECT cp.id, i.id
FROM child_profiles cp
CROSS JOIN UNNEST(cp.tasted_ingredients) AS t(ingredient_name)
JOIN ingredients i ON i.name = t.ingredient_name AND i.source = 'system'
ON CONFLICT DO NOTHING;

-- ─── 5. Drop old column ───────────────────────────────────────────────────────
ALTER TABLE child_profiles DROP COLUMN IF EXISTS tasted_ingredients;

-- ─── 6. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_tasted_ingredients ENABLE ROW LEVEL SECURITY;

-- All authenticated users read all ingredients
CREATE POLICY "ingredients_read" ON ingredients FOR SELECT TO authenticated USING (true);

-- Users insert their own custom ingredients
CREATE POLICY "ingredients_insert_own" ON ingredients FOR INSERT TO authenticated
  WITH CHECK (source = 'user' AND user_id = auth.uid());

-- Users delete their own custom ingredients
CREATE POLICY "ingredients_delete_own" ON ingredients FOR DELETE TO authenticated
  USING (source = 'user' AND user_id = auth.uid());

-- Users manage tasted ingredients for their own child profile
CREATE POLICY "tasted_all_own" ON child_tasted_ingredients FOR ALL TO authenticated
  USING (
    child_profile_id IN (SELECT id FROM child_profiles WHERE user_id::uuid = auth.uid())
  )
  WITH CHECK (
    child_profile_id IN (SELECT id FROM child_profiles WHERE user_id::uuid = auth.uid())
  );
