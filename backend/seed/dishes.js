/* ===========================================================================
   RECOGNISABLE FOOD DECK

   The prediction asks "would you like this?" — a question that only works if
   the reader instantly knows what "this" is. Cards like "Umami bomb",
   "Elevated casual" or "Under 15 dollars" fail that test: they are attributes
   of a meal, not a thing anyone pictures. This file is the opposite: food
   people can see in their head the moment they read the name.

   RARITY here means FAMILIARITY, not obscurity for its own sake:
     1  everyone knows it            (Cheese quesadilla, Pepperoni pizza)
     2  most people know it          (Al pastor taco, Pad see ew)
     3  adventurous / regional       (Birria taco, Khachapuri)

   That mapping matters downstream — the "Familiar vs Adventurous" axis reads
   rarity directly, so mis-tagging a household dish as rare would quietly
   corrupt the axis it feeds.

   Names are built by combining a real base with real variants. Combination is
   only used where every product is a dish somebody actually orders — tacos by
   filling, pizza by topping — never to inflate the count with plausible-
   sounding nonsense.
   =========================================================================== */

/* base, [ [variant, rarity], ... ] -> "Variant base" */
const build = (family, base, variants) =>
  variants.map(([v, rarity]) => ({
    name: `${v} ${base}`,
    family,
    kind: "dish",
    rarity,
  }));

/* standalone dish names */
const plain = (family, list) =>
  list.map(([name, rarity]) => ({ name, family, kind: "dish", rarity }));

const cards = [].concat(
  // ---------------------------------------------------------------- HANDHELD
  build("Handheld", "taco", [
    ["Chicken", 1], ["Beef", 1], ["Steak", 1], ["Fish", 1], ["Shrimp", 1],
    ["Carne asada", 2], ["Al pastor", 2], ["Carnitas", 2], ["Barbacoa", 2],
    ["Chorizo", 2], ["Birria", 3], ["Lengua", 3], ["Suadero", 3], ["Nopal", 3],
  ]),
  build("Handheld", "burrito", [
    ["Chicken", 1], ["Steak", 1], ["Bean and cheese", 1], ["Breakfast", 1],
    ["California", 2], ["Carne asada", 2], ["Wet", 2], ["Chimichanga", 2],
  ]),
  build("Handheld", "quesadilla", [
    ["Cheese", 1], ["Chicken", 1], ["Steak", 1], ["Veggie", 1],
    ["Mushroom", 2], ["Birria", 3],
  ]),
  build("Handheld", "empanada", [
    ["Beef", 1], ["Chicken", 1], ["Cheese", 1], ["Ham and cheese", 2],
    ["Spinach", 2], ["Corn", 2], ["Tuna", 3],
  ]),
  build("Handheld", "sandwich", [
    ["Grilled cheese", 1], ["Club", 1], ["BLT", 1], ["Turkey", 1], ["Tuna", 1],
    ["Chicken salad", 1], ["Egg salad", 1], ["Meatball", 1], ["Philly", 2],
    ["Reuben", 2], ["Pastrami", 2], ["Muffuletta", 3], ["Porchetta", 3],
  ]),
  build("Handheld", "burger", [
    ["Cheese", 1], ["Bacon", 1], ["Double", 1], ["Smash", 1], ["Veggie", 1],
    ["Mushroom swiss", 2], ["BBQ", 2], ["Patty melt", 2], ["Juicy Lucy", 3],
  ]),
  build("Handheld", "wrap", [["Chicken caesar", 1], ["Falafel", 2], ["Shawarma", 2]]),
  plain("Handheld", [
    ["Hot dog", 1], ["Chili dog", 1], ["Corn dog", 1], ["Sloppy joe", 1],
    ["Pulled pork sandwich", 1], ["Fried chicken sandwich", 1], ["Lobster roll", 2],
    ["Banh mi", 2], ["Gyro", 2], ["Shawarma", 2], ["Falafel pita", 2],
    ["Torta", 2], ["Cubano", 2], ["Italian beef", 2], ["Po' boy", 2],
    ["Arepa", 2], ["Pupusa", 3], ["Roti wrap", 3], ["Jianbing", 3],
  ]),

  // ----------------------------------------------------------------- NOODLES
  build("Noodles", "ramen", [
    ["Tonkotsu", 2], ["Miso", 2], ["Shoyu", 2], ["Shio", 3], ["Spicy miso", 2],
  ]),
  build("Noodles", "pasta", [
    ["Spaghetti and meatball", 1], ["Mac and cheese", 1],
  ]),
  plain("Noodles", [
    ["Spaghetti bolognese", 1], ["Fettuccine alfredo", 1], ["Lasagna", 1],
    ["Penne vodka", 1], ["Carbonara", 1], ["Cacio e pepe", 2], ["Pesto pasta", 1],
    ["Baked ziti", 1], ["Ravioli", 1], ["Gnocchi", 2], ["Linguine and clams", 2],
    ["Amatriciana", 3], ["Puttanesca", 3], ["Orecchiette", 3],
    ["Pad thai", 1], ["Pad see ew", 2], ["Drunken noodles", 2], ["Lo mein", 1],
    ["Chow mein", 1], ["Dan dan noodles", 2], ["Beef noodle soup", 2],
    ["Pho", 1], ["Bun bo hue", 3], ["Bun cha", 3], ["Yakisoba", 2],
    ["Udon", 2], ["Soba", 2], ["Japchae", 2], ["Jjajangmyeon", 3],
    ["Laksa", 3], ["Char kway teow", 3], ["Mie goreng", 3], ["Biang biang noodles", 3],
  ]),

  // -------------------------------------------------------------------- RICE
  plain("Rice", [
    ["Fried rice", 1], ["Chicken fried rice", 1], ["Shrimp fried rice", 1],
    ["Burrito bowl", 1], ["Chicken and rice", 1], ["Rice and beans", 1],
    ["Bibimbap", 2], ["Katsu curry", 2], ["Omurice", 2], ["Chicken teriyaki bowl", 1],
    ["Poke bowl", 1], ["Paella", 2], ["Risotto", 2], ["Jollof rice", 2],
    ["Biryani", 2], ["Arroz con pollo", 2], ["Nasi goreng", 3], ["Nasi lemak", 3],
    ["Congee", 3], ["Claypot rice", 3], ["Chirashi", 3],
  ]),

  // ------------------------------------------------------------------- PIZZA
  build("Pizza", "pizza", [
    ["Cheese", 1], ["Pepperoni", 1], ["Sausage", 1], ["Veggie", 1],
    ["Meat lovers", 1], ["Hawaiian", 1], ["BBQ chicken", 1], ["Buffalo chicken", 1],
    ["Margherita", 1], ["White", 2], ["Marinara", 2], ["Four cheese", 2],
    ["Diavola", 3], ["Vodka", 2],
  ]),
  plain("Pizza", [
    ["New York slice", 1], ["Deep dish", 1], ["Detroit style", 2],
    ["Sicilian slice", 2], ["Grandma slice", 2], ["Neapolitan", 2],
    ["Tavern thin crust", 2], ["Calzone", 1], ["Stromboli", 2], ["Focaccia", 2],
  ]),

  // ----------------------------------------------------------- GRILL & SMOKE
  plain("Grill & Smoke", [
    ["Brisket", 1], ["Pulled pork", 1], ["Baby back ribs", 1], ["Spare ribs", 1],
    ["Burnt ends", 2], ["Smoked chicken", 1], ["Smoked turkey", 2],
    ["Grilled steak", 1], ["Ribeye", 1], ["Filet mignon", 1], ["New York strip", 1],
    ["Grilled chicken", 1], ["Chicken kebab", 1], ["Lamb kebab", 2],
    ["Korean BBQ short rib", 2], ["Bulgogi", 2], ["Samgyeopsal", 3],
    ["Yakitori", 2], ["Souvlaki", 2], ["Shish tawook", 3], ["Churrasco", 2],
    ["Peri peri chicken", 2], ["Jerk chicken", 2], ["Tandoori chicken", 2],
    ["Al fresco grilled octopus", 3], ["Robata", 3], ["Kofta", 3],
  ]),

  // ------------------------------------------------------------------- FRIED
  plain("Fried", [
    ["Fried chicken", 1], ["Chicken tenders", 1], ["Chicken nuggets", 1],
    ["Buffalo wings", 1], ["Boneless wings", 1], ["Korean fried chicken", 2],
    ["Nashville hot chicken", 2], ["Chicken and waffles", 1],
    ["Fish and chips", 1], ["Fried shrimp", 1], ["Calamari", 1],
    ["Mozzarella sticks", 1], ["Onion rings", 1], ["French fries", 1],
    ["Loaded fries", 1], ["Poutine", 2], ["Tater tots", 1], ["Hash browns", 1],
    ["Tempura", 2], ["Tonkatsu", 2], ["Schnitzel", 2], ["Milanesa", 2],
    ["Falafel", 2], ["Samosa", 2], ["Spring roll", 1], ["Egg roll", 1],
    ["Croquette", 3], ["Fritto misto", 3], ["Hush puppies", 3],
  ]),

  // ------------------------------------------------------------- SOUP & STEW
  plain("Soup & Stew", [
    ["Chicken noodle soup", 1], ["Tomato soup", 1], ["Clam chowder", 1],
    ["Chili", 1], ["Beef stew", 1], ["Minestrone", 1], ["French onion soup", 1],
    ["Miso soup", 1], ["Egg drop soup", 1], ["Hot and sour soup", 1],
    ["Wonton soup", 1], ["Tortilla soup", 1], ["Pozole", 2], ["Menudo", 3],
    ["Birria consomme", 3], ["Tom yum", 2], ["Tom kha", 2], ["Curry laksa", 3],
    ["Ramen broth", 2], ["Sinigang", 3], ["Kare kare", 3], ["Bouillabaisse", 3],
    ["Cassoulet", 3], ["Goulash", 2], ["Borscht", 3], ["Harira", 3],
    ["Doro wat", 3], ["Gumbo", 2], ["Jambalaya", 2], ["Ramen", 1],
  ]),

  // -------------------------------------------------------------- SMALL PLATES
  plain("Small Plates", [
    ["Nachos", 1], ["Guacamole and chips", 1], ["Queso dip", 1],
    ["Hummus", 1], ["Bruschetta", 1], ["Garlic bread", 1], ["Deviled eggs", 1],
    ["Chicken satay", 2], ["Edamame", 1], ["Gyoza", 1], ["Potstickers", 1],
    ["Xiao long bao", 2], ["Har gow", 2], ["Siu mai", 2], ["Char siu bao", 2],
    ["Dim sum", 2], ["Tapas", 2], ["Patatas bravas", 2], ["Croquetas", 2],
    ["Pintxos", 3], ["Mezze", 2], ["Banchan", 3], ["Tteokbokki", 3],
    ["Takoyaki", 3], ["Empanadas", 1], ["Arancini", 2], ["Antipasti", 2],
  ]),

  // ------------------------------------------------------------- RAW & COLD
  plain("Raw & Cold", [
    ["California roll", 1], ["Spicy tuna roll", 1], ["Salmon nigiri", 1],
    ["Tuna nigiri", 1], ["Rainbow roll", 1], ["Dragon roll", 1],
    ["Hand roll", 2], ["Sashimi", 2], ["Omakase", 3], ["Chirashi bowl", 3],
    ["Ceviche", 2], ["Poke", 1], ["Oysters", 2], ["Shrimp cocktail", 1],
    ["Tartare", 3], ["Carpaccio", 3], ["Crudo", 3], ["Tiradito", 3],
    ["Caprese salad", 1], ["Caesar salad", 1], ["Greek salad", 1],
    ["Cobb salad", 1], ["Garden salad", 1],
  ]),

  // --------------------------------------------------------------- BREAKFAST
  plain("Breakfast", [
    ["Pancakes", 1], ["Waffles", 1], ["French toast", 1], ["Omelette", 1],
    ["Scrambled eggs", 1], ["Eggs benedict", 1], ["Bacon and eggs", 1],
    ["Breakfast burrito", 1], ["Bacon egg and cheese", 1], ["Avocado toast", 1],
    ["Bagel and lox", 1], ["Cereal", 1], ["Oatmeal", 1], ["Yogurt parfait", 1],
    ["Biscuits and gravy", 1], ["Huevos rancheros", 2], ["Chilaquiles", 2],
    ["Shakshuka", 2], ["Full English", 2], ["Dutch baby", 3],
    ["Congee breakfast", 3], ["Khachapuri", 3], ["Dim sum brunch", 2],
  ]),

  // ------------------------------------------------------------------- SWEET
  plain("Sweet", [
    ["Chocolate cake", 1], ["Cheesecake", 1], ["Brownie", 1], ["Cookie", 1],
    ["Ice cream", 1], ["Soft serve", 1], ["Milkshake", 1], ["Sundae", 1],
    ["Apple pie", 1], ["Key lime pie", 1], ["Pecan pie", 1], ["Donut", 1],
    ["Cinnamon roll", 1], ["Croissant", 1], ["Cupcake", 1], ["Tiramisu", 1],
    ["Cannoli", 1], ["Gelato", 1], ["Churros", 1], ["Flan", 2],
    ["Tres leches", 2], ["Mochi", 2], ["Mochi donut", 2], ["Baklava", 2],
    ["Basque cheesecake", 3], ["Bingsu", 3], ["Halo halo", 3], ["Taiyaki", 3],
    ["Knafeh", 3], ["Kouign amann", 3], ["Banana pudding", 1], ["Bread pudding", 2],
  ]),

  // ------------------------------------------------------------------ DRINKS
  plain("Drinks", [
    ["Drip coffee", 1], ["Latte", 1], ["Cappuccino", 1], ["Espresso", 1],
    ["Cold brew", 1], ["Iced coffee", 1], ["Mocha", 1], ["Americano", 1],
    ["Chai latte", 1], ["Matcha latte", 2], ["Hot chocolate", 1],
    ["Boba milk tea", 1], ["Thai iced tea", 2], ["Vietnamese iced coffee", 2],
    ["Horchata", 2], ["Agua fresca", 2], ["Lemonade", 1], ["Smoothie", 1],
    ["Fresh juice", 1], ["Craft beer", 1], ["Draft beer", 1], ["Margarita", 1],
    ["Old fashioned", 2], ["Espresso martini", 2], ["Natural wine", 3],
    ["Mezcal", 3], ["Sake", 2], ["Michelada", 3], ["Cortado", 3], ["Pour over", 3],
  ]),
);

/* Duplicates would double-count in a family total and make a region look
   larger than it is, so they're removed here rather than relied on the
   database to reject. */
const seen = new Set();
const deck = cards.filter((c) => {
  const key = c.name.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

module.exports = deck;
