/* The long form of a food guide: what someone reading "korean food" or "coffee"
 * actually wants to know, beyond how to judge a place.
 *
 * WHY THESE TWO
 * /food/korean-food and /food/coffee are the guides Google shows most (Search
 * Console, November 2026: 638 and 667 impressions over three months, positions
 * 31.7 and 24.2, no clicks). Their impressions come from "near me" searches
 * ("korean restaurants near me", "coffee shops near me"), where page one is a
 * map and listings for the searcher's own city, and no national page can take
 * those places. The searches a guide can win are the questions behind them:
 * what to order, what a dish or a drink is, how Korean barbecue works, latte or
 * cappuccino. So each page keeps "near you" in its title and gains the most
 * complete plain answer to those questions.
 *
 * Every line is general, checkable food knowledge, written plainly. Nothing
 * here rates a restaurant.
 *
 * Fields (all optional), rendered by make-guide-pages.js in this order:
 *   quick: { h, items: [[name, what]] }        "first time? start here", right under the h1
 *   menu:  { h, intro, groups: [{ h, rows: [[name, what, spice]] }] }   a table per group
 *   table: { h, intro, cols: [..], rows: [[..]], note }                 one comparison table
 *   more:  [{ h, paras: [..], list: [[term, what]] }]                   short explainers
 *   faq:   { h, items: [[question, answer]] }  visible questions, also in the page's FAQPage schema
 *   links: { "Dish name": "guide-slug" }      names in the tables that link to their own guide
 *   order: false                              drop the guide's own "What to order" (the menu covers it)
 *
 * {n} in a title or description is the number of dishes or drinks in the
 * tables, and {n-3} that number less three, so a count in a title can't drift
 * from the page.
 */
module.exports = {
  "korean-food": {
    order: false,
    links: {
      "Korean barbecue": "korean-bbq", Bibimbap: "bibimbap", Tteokbokki: "tteokbokki",
      "Korean fried chicken": "korean-fried-chicken", Mandu: "dumplings",
    },
    quick: {
      h: "First time? Start with these five",
      items: [
        ["Bibimbap", "Rice topped with vegetables, usually beef, and a fried egg, mixed with gochujang chili paste. Get it in a hot stone bowl (dolsot) for the crispy rice."],
        ["Bulgogi", "Thin slices of beef in a sweet soy marinade. The easiest way in."],
        ["Kimchi jjigae", "A bubbling kimchi stew with pork and tofu. The everyday classic, and spicy."],
        ["Korean fried chicken", "Fried twice for a thin, crackly crust, then glazed: yangnyeom (sweet and spicy) or soy garlic."],
        ["Japchae", "Glass noodles stir-fried with vegetables. Mild and a little sweet."],
      ],
    },
    menu: {
      h: "Korean dishes explained",
      intro: "What each dish on a typical Korean menu is, and how spicy it usually is. Spice varies by kitchen, and many places will make a dish milder if you ask.",
      groups: [
        { h: "Korean barbecue", rows: [
          ["Samgyeopsal", "Thick slices of unmarinated pork belly, grilled at the table.", "Mild"],
          ["Galbi", "Beef short ribs in a sweet soy and garlic marinade.", "Mild"],
          ["Bulgogi", "Thinly sliced beef in a sweet soy marinade.", "Mild"],
          ["Chadolbagi", "Paper-thin beef brisket that cooks in seconds.", "Mild"],
          ["Dwaeji bulgogi", "Pork in a spicy gochujang chili paste marinade. Dwaeji means pork.", "Spicy"],
        ] },
        { h: "Stews and soups", rows: [
          ["Kimchi jjigae", "Sour, spicy kimchi stew with pork and tofu.", "Spicy"],
          ["Sundubu jjigae", "Silken tofu stew, usually with seafood or pork and an egg cracked in. Many places let you pick the spice level.", "Medium to spicy"],
          ["Doenjang jjigae", "Fermented soybean paste stew with tofu and vegetables. Earthy, like a stronger miso soup.", "Mild"],
          ["Budae jjigae", "“Army stew” with Spam, sausage, ramen noodles and kimchi, made for sharing.", "Spicy"],
          ["Gamjatang", "Pork spine and potato stew.", "Spicy"],
          ["Seolleongtang", "Milky beef bone soup. You season it yourself with salt and scallions.", "Mild"],
          ["Galbitang", "Clear short rib soup with glass noodles.", "Mild"],
        ] },
        { h: "Rice and noodles", rows: [
          ["Bibimbap", "Rice with vegetables, meat and an egg, mixed with gochujang. Dolsot bibimbap comes in a hot stone bowl that crisps the rice.", "Mild to medium"],
          ["Japchae", "Sweet potato glass noodles stir-fried with vegetables, often with beef.", "Mild"],
          ["Naengmyeon", "Cold buckwheat noodles, either in an icy broth (mul naengmyeon) or with a spicy sauce (bibim naengmyeon).", "Mild or spicy"],
          ["Jajangmyeon", "Wheat noodles in black bean sauce, a Korean-Chinese favorite.", "Mild"],
          ["Kimbap", "Rice and fillings rolled in seaweed and sliced. The fillings are usually cooked, not raw fish.", "Mild"],
        ] },
        { h: "Snacks and dishes to share", rows: [
          ["Tteokbokki", "Chewy rice cakes in a sweet and spicy gochujang sauce.", "Spicy"],
          ["Korean fried chicken", "Fried twice for a thin, crisp crust, then served plain, glazed with yangnyeom sauce or with soy garlic.", "Mild to spicy"],
          ["Pajeon", "A savory scallion pancake. Haemul pajeon adds seafood.", "Mild"],
          ["Mandu", "Dumplings, steamed or pan-fried.", "Mild"],
          ["Bossam", "Boiled pork belly you wrap in cabbage leaves with kimchi.", "Mild"],
          ["Jokbal", "Pig's trotters braised in soy and spices, sliced and usually served cold.", "Mild"],
        ] },
      ],
    },
    more: [
      { h: "How Korean barbecue works",
        list: [
          ["You grill at the table", "At many places the server does the cooking and cuts the meat with scissors. Let them."],
          ["Start with the plain cuts", "Order unmarinated meat like samgyeopsal or chadolbagi first, and the marinated galbi and bulgogi later. The sugar in a marinade chars the grill."],
          ["Wrap each bite", "Put a piece of meat in a lettuce leaf with ssamjang (a thick, savory chili and bean paste), garlic and a little kimchi. That's ssam."],
          ["Expect a minimum", "Many barbecue places ask each table to order at least two portions of meat. The side dishes and lettuce come with it."],
        ] },
      { h: "What banchan are",
        paras: [
          "Banchan are the small side dishes that arrive with your meal at no extra charge, and most places refill them if you ask. Common ones are kimchi, seasoned bean sprouts (kongnamul), spinach (sigeumchi namul), fish cake (eomuk) and soy-braised potatoes (gamja jorim).",
        ] },
      { h: "Eating Korean food vegetarian",
        paras: [
          "Ask for bibimbap without meat, japchae without beef, vegetable kimbap or pajeon without seafood. Check the stews: many are made with anchovy or beef broth, and traditional kimchi usually contains fish sauce or salted shrimp.",
        ] },
    ],
    faq: {
      h: "Questions people ask about Korean food",
      items: [
        ["What should I order at a Korean restaurant for the first time?", "Bibimbap, bulgogi or japchae if you want something mild; kimchi jjigae or tteokbokki if you like spice. With a group, Korean barbecue is the classic choice: start with pork belly (samgyeopsal) and marinated short ribs (galbi)."],
        ["Is Korean food spicy?", "A lot of it is, from gochujang chili paste and chili flakes, but plenty isn't: bulgogi, galbi, japchae, doenjang jjigae and seolleongtang are all mild. Menus often mark the spicy dishes, and for sundubu jjigae many places let you choose the level."],
        ["What is banchan?", "The small side dishes, like kimchi, seasoned vegetables and fish cake, that come free with a Korean meal. Most restaurants refill them if you ask."],
        ["What's the difference between bulgogi and galbi?", "Both are marinated beef. Bulgogi is thinly sliced and cooks fast; galbi is short rib, thicker, and often served on the bone."],
        ["Do you tip at Korean barbecue?", "In the US, yes, the same as at any sit-down restaurant, usually 15 to 20 percent. The server often cooks the meat for you."],
      ],
    },
  },

  coffee: {
    quick: {
      h: "Not sure what to order?",
      items: [
        ["You like it strong", "An Americano (espresso and hot water), or a cortado or flat white if you want a little milk."],
        ["You like it milky", "A latte, the mildest espresso drink."],
        ["You like it sweet", "A mocha, or a latte with a flavor syrup."],
        ["It's hot out", "Cold brew, which tastes smooth and low in acidity, or an iced latte."],
        ["You want to taste the coffee itself", "A pour-over."],
      ],
    },
    table: {
      h: "Coffee drinks explained",
      intro: "What's in each drink on a typical coffee shop menu, and how it tastes.",
      cols: ["Drink", "What's in it", "Taste"],
      rows: [
        ["Espresso", "A small, concentrated shot of coffee made by forcing hot water through finely ground beans. A “double” is two shots.", "Intense and rich; the base of most drinks"],
        ["Americano", "Espresso topped up with hot water.", "Like strong black coffee"],
        ["Latte", "Espresso with a lot of steamed milk and a thin layer of foam.", "Mild and creamy, the milkiest"],
        ["Cappuccino", "Espresso with less steamed milk than a latte and a thick layer of foam.", "Stronger and foamier than a latte"],
        ["Flat white", "Espresso, often a double, with less milk than a latte, steamed silky with only a thin layer of foam.", "Coffee-forward and velvety"],
        ["Cortado", "Espresso with about the same amount of warm milk.", "Balanced, small and strong"],
        ["Macchiato", "Espresso with a spoonful of milk foam on top.", "Strong, barely softened"],
        ["Mocha", "A latte with chocolate.", "Sweet, like hot chocolate with coffee"],
        ["Drip coffee", "Filter coffee brewed in a batch, also called batch brew.", "Classic black coffee"],
        ["Pour-over", "Filter coffee brewed by hand, one cup at a time.", "Clean; you taste the beans most"],
        ["Cold brew", "Coffee steeped in cold water for 12 to 24 hours.", "Smooth, low in acidity, often strong"],
        ["Iced coffee", "Hot-brewed coffee, chilled or poured over ice.", "Lighter and brighter than cold brew"],
        ["Red eye", "Drip coffee with a shot of espresso added.", "Extra strong"],
        ["Affogato", "A shot of espresso poured over ice cream.", "Dessert"],
        ["Chai latte", "Spiced black tea with steamed milk. No coffee, unless you order a “dirty chai”.", "Sweet and spiced"],
      ],
      note: "At big chains, a caramel macchiato is a vanilla latte with espresso poured on top and caramel drizzled over it: much sweeter than a traditional macchiato.",
    },
    more: [
      { h: "Latte vs cappuccino vs flat white",
        paras: [
          "All three are espresso and steamed milk; what changes is how much milk and how much foam. A latte has the most milk and a thin layer of foam, so it tastes mildest. A cappuccino has less milk and a thick, airy layer of foam. A flat white has less milk than a latte, steamed into a velvety texture with no thick foam on top, so the coffee comes through most.",
          "If lattes taste too milky to you, order a flat white or a cortado.",
        ] },
      { h: "How to order at a coffee shop",
        list: [
          ["Size", "Small, medium or large; some shops only make cappuccinos and flat whites in one size."],
          ["Strength", "Ask for an extra shot to make any espresso drink stronger."],
          ["Milk", "Most shops use whole or 2% milk unless you ask. Oat, almond and soy are the usual non-dairy choices."],
          ["Sweetness", "Many shops measure flavor syrups in pumps. Ask for half the usual amount if drinks taste too sweet to you."],
          ["Hot or iced", "Nearly every espresso drink can be made iced."],
        ] },
    ],
    faq: {
      h: "Questions people ask about coffee",
      items: [
        ["What's the difference between a latte and a cappuccino?", "Both are espresso with steamed milk. A latte has more milk and only a thin layer of foam, so it tastes milder and creamier. A cappuccino is smaller with a thick layer of foam, so the coffee tastes stronger."],
        ["What is a flat white?", "Espresso, usually a double, with silky steamed milk and only a thin layer of foam. It has less milk than a latte, so the coffee flavor is stronger."],
        ["Which coffee has the most caffeine?", "Espresso is the most concentrated per sip, but one shot has less caffeine than a full cup of drip coffee. Drip coffee and cold brew usually have the most per cup, and an extra shot adds more to any espresso drink."],
        ["What should I order if I don't like bitter coffee?", "A latte or a mocha, where milk and chocolate soften the coffee, or a cold brew, which tastes smoother and less acidic than hot coffee."],
        ["What's the difference between cold brew and iced coffee?", "Iced coffee is brewed hot and then cooled. Cold brew is steeped in cold water for 12 to 24 hours, which makes it smoother, less acidic and often stronger."],
      ],
    },
  },
};
