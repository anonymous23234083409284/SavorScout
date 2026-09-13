/* Hand-written food identity for the 50 largest US cities.
 *
 * WHY THIS FILE REPLACED A THOUSAND GENERATED PAGES
 * The old /eat/ set covered 1,000 cities from a population figure and a county
 * restaurant count. Every page was true and no page was interesting, because
 * nothing in it could only have been written about that city. 531 of them even
 * shared a county with another, so they shared their only real data too. That
 * is a content farm with good sourcing, and it reads like one.
 *
 * Fifty is a number you can actually write. American cities have genuinely
 * distinct food cultures — Nashville is not Memphis, Philadelphia is not
 * Baltimore, Albuquerque is not Tucson — and once there are only fifty pages,
 * saying so properly becomes possible.
 *
 * WHAT IS AND IS NOT IN HERE
 * Regional dishes, food traditions and long-established food districts: things
 * that are documented, checkable, and stable over decades.
 *
 * NOT individual restaurants. Not "the best X in Y". Restaurants close, change
 * hands and get worse, and a page claiming the best taco in a city it has never
 * visited is exactly the invented local detail that destroys trust with the one
 * reader who actually lives there. The dishes are real; which kitchen does them
 * best is what the app is for.
 */

module.exports = [
  {
    s: "new-york-ny",
    identity: [
      "New York's food reputation rests on two things that pull in opposite directions. There is the canon — the bagel, the slice, the pastrami on rye — which is genuinely excellent and which every visitor eats. And there is the fact that the outer boroughs contain what is probably the densest concentration of immigrant cooking on earth, most of which no visitor ever sees.",
      "The canon is worth taking seriously rather than dismissing as tourist food. A properly boiled-then-baked bagel, a slice folded lengthwise, hand-carved pastrami — these are all local techniques with a hundred years behind them. The mistake is stopping there.",
    ],
    dishes: [
      ["The slice", "Thin, wide, foldable, sold by the piece. Judged on whether it bends without cracking and holds without flopping."],
      ["Bagels", "Boiled before baking, which is what produces the chew. A steamed bagel is a bread roll with a hole."],
      ["Pastrami on rye", "Navel cut, cured, smoked, steamed, hand-sliced. The Jewish deli tradition, and increasingly rare done properly."],
      ["Halal cart chicken and rice", "Street food that became a genuine New York dish. The white sauce is the argument."],
      ["Dollar dumplings and hand-pulled noodles", "Chinatown and Flushing, and among the best value food in the country."],
    ],
    areas: [
      ["Flushing, Queens", "Arguably the best Chinese food in the United States, spanning far more regions than Manhattan's Chinatown."],
      ["Jackson Heights, Queens", "South Asian, Himalayan, Colombian and Mexican within a few blocks."],
      ["Arthur Avenue, the Bronx", "The Italian market district locals will tell you beats Little Italy, and they are right."],
    ],
    searches: ["a slice worth the trip", "regional Chinese in Flushing", "old-school deli", "cheap eats near me"],
    foods: ["pizza", "sandwiches", "dumplings", "chinese-food", "noodles"],
  },
  {
    s: "los-angeles-ca",
    identity: [
      "Los Angeles is the best eating city in America and the hardest to eat well in, for the same reason: the good food is spread across five hundred square miles of strip malls, and nothing about a building's exterior tells you what is happening inside it.",
      "The organising fact is immigration. LA has the largest Mexican, Korean, Thai, Armenian, Filipino and Iranian populations in the country, and in most cases those communities cook for themselves rather than for visitors. A strip mall in the San Gabriel Valley will have regional Chinese cooking that does not exist east of here.",
    ],
    dishes: [
      ["Tacos", "Al pastor from a trompo, carne asada from a truck, and a salsa bar that means it. The single thing LA does better than anywhere else in the US."],
      ["Korean barbecue and banchan", "Koreatown is the largest Korean community outside Korea, and the food is not adjusted for anyone."],
      ["Thai food, at actual heat", "Thai Town is the only officially designated one in the country. Ask for it properly spicy and it arrives properly spicy."],
      ["Regional Chinese, San Gabriel Valley", "Sichuan, Shaanxi, Hunan, Dongbei, Taiwanese — the deepest concentration in North America."],
      ["Armenian and Persian in Glendale", "Kebabs, lavash, tahdig. Under-visited and excellent."],
    ],
    areas: [
      ["Koreatown", "Dense, late, and open when everywhere else has closed."],
      ["The San Gabriel Valley", "Alhambra, Monterey Park, San Gabriel — the Chinese food capital of the country."],
      ["Boyle Heights and East LA", "Mexican cooking with no concessions."],
    ],
    searches: ["al pastor from a trompo", "Sichuan in the SGV", "Thai spicy, not American spicy", "open past midnight"],
    foods: ["tacos", "korean-food", "thai-food", "chinese-food", "mexican-food"],
  },
  {
    s: "chicago-il",
    identity: [
      "Chicago's food identity is more argued about than any other American city's, mostly because the thing it is famous for is not the thing it eats. Deep dish is real, it is good, and locals order it a few times a year at most. The everyday pizza here is tavern-style: cracker-thin, cut into squares, eaten standing up.",
      "Underneath the famous dishes is a genuine working-city food culture — Polish, Mexican, Greek, and a sandwich tradition that takes structural risks nowhere else would attempt.",
    ],
    dishes: [
      ["Italian beef", "Thin-sliced beef in gravy on a long roll, with giardiniera. Order it dipped and accept that it will not survive the journey."],
      ["Tavern-style pizza", "What Chicago actually eats. Cracker-thin, square-cut, and a completely different dish from deep dish."],
      ["Deep dish", "Genuinely good, genuinely not a weeknight food. Order it knowing it takes 45 minutes to bake."],
      ["The Chicago dog", "Poppy seed bun, yellow mustard, neon relish, sport peppers, celery salt. No ketchup, and people mean it."],
      ["Mexican food in Pilsen and Little Village", "One of the largest Mexican populations in the country, and the best everyday eating in the city."],
    ],
    areas: [
      ["Pilsen and Little Village", "Mexican bakeries, taquerias and birria."],
      ["Devon Avenue", "South Asian — Indian, Pakistani, Bangladeshi — for a mile."],
      ["Bridgeport and Chinatown", "One of the few US Chinatowns still growing rather than shrinking."],
    ],
    searches: ["italian beef, dipped", "tavern-style thin crust", "birria in Little Village", "late night after a show"],
    foods: ["pizza", "sandwiches", "mexican-food", "chinese-food", "indian-food"],
  },
  {
    s: "houston-tx",
    identity: [
      "Houston is the most ethnically diverse large city in the United States, and its food shows it more directly than anywhere else — partly because it has no zoning, so a Vietnamese crawfish place, a Nigerian restaurant and a Texas barbecue joint can sit on the same block.",
      "The city's signature invention is a collision: Viet-Cajun crawfish, created when Vietnamese immigrants took over Gulf Coast seafood traditions and added garlic butter, lemongrass and chilli. It exists elsewhere now, but it started here.",
    ],
    dishes: [
      ["Viet-Cajun crawfish", "Boiled then tossed in garlic butter with lemongrass. Seasonal, messy, and genuinely a Houston creation."],
      ["Texas barbecue", "Brisket, salt and pepper, post oak. Houston's version leans a little more Mexican and Vietnamese than Central Texas."],
      ["Banh mi", "The Vietnamese community here is one of the largest in the country and the bread is taken seriously."],
      ["Tex-Mex and breakfast tacos", "Flour tortillas, queso, fajitas. A real cuisine with its own standards, not a lesser Mexican."],
      ["Nigerian and West African", "Houston has among the largest West African populations in the US, and jollof, egusi and suya are widely available."],
    ],
    areas: [
      ["Asiatown / Bellaire Boulevard", "Vietnamese, Chinese, Korean and Malaysian for several miles."],
      ["The Heights", "Where much of the newer independent cooking has landed."],
    ],
    searches: ["viet-cajun crawfish", "brisket, fatty", "banh mi", "somewhere with parking"],
    foods: ["bbq", "vietnamese-food", "seafood", "tacos", "sandwiches"],
  },
  {
    s: "philadelphia-pa",
    identity: [
      "Philadelphia is a sandwich city that spent forty years being known for its worst sandwich. The cheesesteak is fine — genuinely good when the meat is chopped properly and cooked on the same surface as the onions — but the roast pork with broccoli rabe and sharp provolone is the better one, and locals will tell you so unprompted.",
      "It is also, per capita, one of the strongest independent restaurant cities in the country, helped by a long-standing BYOB culture that let small kitchens open without a liquor licence.",
    ],
    dishes: [
      ["Roast pork sandwich", "Long-roasted pork, broccoli rabe, sharp provolone, on a seeded roll. The city's actual best sandwich."],
      ["Cheesesteak", "The argument is about the cheese. The variable that matters is whether the meat is chopped fine and cooked with the onions."],
      ["Hoagies", "Italian, on seeded Philly bread, with oil and oregano."],
      ["Soft pretzels", "Figure-eight shaped, sold from carts, eaten with yellow mustard."],
      ["Scrapple", "Pork and cornmeal loaf, sliced and fried crisp. A regional breakfast worth trying once, at minimum."],
    ],
    areas: [
      ["The Italian Market", "One of the oldest continuously operating outdoor markets in the country, now as much Mexican and Vietnamese as Italian."],
      ["Washington Avenue", "Vietnamese and Cambodian, and the best pho in the city."],
      ["Reading Terminal Market", "Pennsylvania Dutch, soul food, and a hundred and thirty years of trading."],
    ],
    searches: ["roast pork with rabe", "BYOB, mid-priced", "pho on Washington Ave", "cheesesteak done right"],
    foods: ["sandwiches", "vietnamese-food", "italian-food", "pho"],
  },
  {
    s: "phoenix-az",
    identity: [
      "Phoenix eats Sonoran, and that is a specific thing rather than a general Mexican. Sonora is the Mexican state directly south, it is cattle and wheat country rather than corn, and the result is a food culture built on flour tortillas — including tortillas so thin and large they are almost translucent.",
      "The heat also shapes when people eat. Summer dining here happens early, late, or indoors, and a restaurant's patio season runs opposite to the rest of the country's.",
    ],
    dishes: [
      ["Sonoran hot dog", "Bacon-wrapped, in a bolillo-style bun, with pinto beans, tomato, onion, mayonnaise and jalapeño salsa. A genuine regional dish."],
      ["Carne asada and flour tortillas", "Sonoran beef country. The tortillas are the tell — thin, large, and made that day."],
      ["Chimichanga", "Claimed by Arizona, and defensible as a local invention."],
      ["Green corn tamales", "Seasonal, sweet, and a Sonoran speciality you will not easily find elsewhere."],
      ["Navajo and Diné frybread tacos", "Indigenous food traditions are present here in a way they are not in most US cities."],
    ],
    areas: [
      ["Central and South Phoenix", "Where the long-running Sonoran places are."],
      ["Mesa's Main Street corridor", "Mexican bakeries and taquerias, and increasingly Brazilian and Middle Eastern."],
    ],
    searches: ["sonoran hot dog", "carne asada, handmade tortillas", "somewhere with air conditioning", "open late in summer"],
    foods: ["mexican-food", "tacos", "bbq", "burgers"],
  },
  {
    s: "san-antonio-tx",
    identity: [
      "San Antonio has the strongest claim to being the birthplace of Tex-Mex, and it treats that as a living cuisine rather than a heritage exhibit. The city's Mexican-American food culture is older than the state of Texas, and it shows in dishes that exist nowhere else.",
      "It is also a UNESCO City of Gastronomy, which sounds like a plaque and in practice means the old family restaurants have been taken seriously enough to survive.",
    ],
    dishes: [
      ["Puffy tacos", "Masa pressed and fried so it puffs, then filled. A San Antonio invention and difficult to do well."],
      ["Breakfast tacos", "Flour tortilla, egg, potato, bean, chorizo. A daily institution, and the subject of a genuine rivalry with Austin."],
      ["Barbacoa and big red", "Weekend barbacoa with a bottle of the local red soda. A tradition, not a novelty."],
      ["Tex-Mex enchiladas and chili con carne", "Chili's documented origins are here, with the chili queens of the 1880s plaza."],
      ["Pan dulce", "Mexican bakeries, early morning, conchas and empanadas."],
    ],
    areas: [
      ["The West Side", "Where the long-running family Mexican restaurants are."],
      ["Southtown", "Newer independent kitchens alongside older institutions."],
    ],
    searches: ["puffy tacos", "breakfast tacos before 8am", "weekend barbacoa", "somewhere that's been here 50 years"],
    foods: ["tacos", "mexican-food", "bbq", "breakfast"],
  },
  {
    s: "san-diego-ca",
    identity: [
      "San Diego's food is Baja food, and the border is twenty minutes away. The fish taco arrived here from Ensenada, and the city's best eating is still overwhelmingly Mexican — a fact that surprises visitors who arrive expecting beach food.",
      "The other genuine local invention is the California burrito, which put french fries inside a carne asada burrito and turned out to be a very good idea.",
    ],
    dishes: [
      ["Baja fish taco", "Battered, fried, cabbage, crema, lime, on corn. Judged on whether the batter is still crisp when it reaches you."],
      ["California burrito", "Carne asada, cheese, guacamole and french fries. A San Diego invention, and a serious one."],
      ["Aguachile and ceviche", "Sinaloan-style, citrus and chilli forward. Best in the Mexican neighbourhoods rather than on the water."],
      ["Carne asada from a taco shop", "The late-night default, and a whole category of restaurant here."],
      ["Craft beer, and food built around it", "More breweries than almost any US city, which has shaped the casual dining scene."],
    ],
    areas: [
      ["Barrio Logan", "Mexican-American, long-standing, and the best eating in the city."],
      ["Convoy Street", "Asian food — Korean, Chinese, Japanese, Vietnamese — concentrated along one corridor."],
    ],
    searches: ["baja fish taco", "california burrito", "aguachile", "late night carne asada"],
    foods: ["tacos", "mexican-food", "seafood", "korean-food"],
  },
  {
    s: "dallas-tx",
    identity: [
      "Dallas eats formally more than most Texas cities — it has a steakhouse culture and a genuine appetite for the expensive end — but the food that actually defines it is spread across the suburbs, where some of the most significant immigrant communities in the South have settled.",
      "The barbecue here has also caught up with Central Texas in the last decade, which locals will tell you and visitors rarely believe.",
    ],
    dishes: [
      ["Brisket", "Salt, pepper, post oak. Dallas barbecue is now genuinely competitive with the Hill Country."],
      ["Tex-Mex, the plate version", "Enchiladas, chile con queso, fajitas. Dallas claims the frozen margarita and the invention of chili con queso as a restaurant dish."],
      ["Vietnamese in Garland and Arlington", "Large communities, and pho and banh mi to match."],
      ["Ethiopian and East African", "Concentrated in the northern suburbs and consistently under-visited."],
      ["The steakhouse", "A real local institution rather than an import, and the format the city does best."],
    ],
    areas: [
      ["Richardson and Plano", "Chinese, Korean, Indian and Vietnamese across the northern suburbs."],
      ["Oak Cliff", "Mexican bakeries, taquerias and newer independent kitchens."],
    ],
    searches: ["brisket, fatty end", "tex-mex with queso", "pho in the suburbs", "steakhouse for a client"],
    foods: ["bbq", "steak", "tacos", "vietnamese-food", "mexican-food"],
  },
  {
    s: "san-jose-ca",
    identity: [
      "San Jose has the largest Vietnamese population of any city outside Vietnam, and that single fact does more to shape its food than anything else. The pho, banh mi, com tam and bun bo Hue here are as good as anywhere in the country and considerably cheaper than in San Francisco.",
      "It is also, unglamorously, a strip-mall food city. The best restaurants are frequently in plazas with a nail salon and a phone repair shop, and the exterior tells you nothing.",
    ],
    dishes: [
      ["Pho and bun bo Hue", "Deep Vietnamese community, and the central-Vietnamese dishes are available, not just the southern ones."],
      ["Com tam", "Broken rice with grilled pork chop and a steamed egg cake. A complete meal and widely available here."],
      ["Banh mi", "Among the best value food in the Bay Area."],
      ["Mexican, in East San Jose", "A long-established Mexican-American community with its own taquerias and bakeries."],
      ["Filipino food", "One of the largest Filipino populations in the US, and lechon, sisig and kamayan feasts to go with it."],
    ],
    areas: [
      ["Story Road and Tully Road", "The heart of Vietnamese San Jose."],
      ["East San Jose", "Mexican bakeries, taquerias and mariscos."],
    ],
    searches: ["bun bo hue", "com tam", "cheap and fast, strip mall", "filipino lechon"],
    foods: ["pho", "vietnamese-food", "mexican-food", "noodles", "sandwiches"],
  },
  {
    s: "austin-tx",
    identity: [
      "Austin's two defining foods pull in different directions: barbecue that people queue three hours for, and breakfast tacos that cost two dollars and take ninety seconds. Both are genuine, and the second one is what Austin actually eats.",
      "The city also effectively normalised the food truck as a permanent restaurant format rather than a temporary one, and a meaningful share of the best cooking here still happens out of a trailer in a gravel lot.",
    ],
    dishes: [
      ["Central Texas brisket", "Salt and pepper, post oak, sliced to order. The queue is real and the fatty end is the one to order."],
      ["Breakfast tacos", "Flour tortilla, egg, potato, bacon or chorizo. Daily food, and a live rivalry with San Antonio over the origin."],
      ["Queso", "Chile con queso as a dish in its own right, not a side."],
      ["Food truck cooking", "Everything from Thai to Venezuelan, often from chefs who left restaurants to do one thing properly."],
      ["Migas", "Eggs with fried tortilla strips, cheese and salsa. A Tex-Mex breakfast staple."],
    ],
    areas: [
      ["East Austin", "Trailers, taquerias and much of the newer independent cooking."],
      ["North Lamar and Rundberg", "The genuinely international corridor — Vietnamese, Indian, Ethiopian, Mexican."],
    ],
    searches: ["brisket without a three hour queue", "breakfast tacos", "food truck dinner", "queso and a margarita"],
    foods: ["bbq", "tacos", "breakfast", "mexican-food"],
  },
  {
    s: "indianapolis-in",
    identity: [
      "Indianapolis has one genuinely distinctive dish and does not make nearly enough of it. The breaded pork tenderloin sandwich — pounded flat until it overhangs the bun by several inches on every side — is an Indiana institution, and the overhang is not a gimmick, it is the point.",
      "Beyond that, the city's food has changed fast in the last fifteen years, with a substantial Burmese community on the south side that most visitors have no idea exists.",
    ],
    dishes: [
      ["Breaded pork tenderloin", "Pounded thin, breaded, fried, served on a bun far too small for it. The state dish in everything but name."],
      ["Burmese food", "Indianapolis has one of the largest Burmese and Chin populations in the US. Tea leaf salad and mohinga are widely available."],
      ["Sugar cream pie", "Indiana's state pie. No eggs, just cream, sugar and nutmeg."],
      ["Midwestern steak and chophouse cooking", "An older tradition the city still does well."],
      ["Mexican on the near west side", "A long-established community with taquerias to match."],
    ],
    areas: [
      ["The south side", "Burmese, Chin and Karen restaurants and grocers."],
      ["Mass Ave and Fountain Square", "Where most of the newer independent kitchens have landed."],
    ],
    searches: ["pork tenderloin sandwich", "burmese tea leaf salad", "somewhere quiet for dinner", "sugar cream pie"],
    foods: ["sandwiches", "steak", "salad", "noodles"],
  },
  {
    s: "jacksonville-fl",
    identity: [
      "Jacksonville is a Southern coastal city rather than a South Florida one, and the difference is the whole story. The food here is closer to Georgia and the Lowcountry than to Miami — shrimp, grits, fried whiting, barbecue — with the Atlantic supplying the seafood directly.",
      "It also has a genuinely distinctive local sweet, the Camel Rider sandwich and the Middle Eastern influence behind it, which reflects a long-established Lebanese and Syrian community most visitors never hear about.",
    ],
    dishes: [
      ["Mayport shrimp", "Local shrimp, usually fried or boiled, landed just east of the city."],
      ["Camel Rider", "A pita-wrapped sub, a local institution, and a legacy of the city's Middle Eastern community."],
      ["Datil pepper hot sauce", "A pepper grown almost exclusively around St Augustine, just south, and used liberally here."],
      ["Southern fish camp cooking", "Fried whiting, hush puppies, grits. The genuine everyday food of the region."],
      ["Florida-Georgia barbecue", "Pork-forward, vinegar and mustard influences from the Carolinas and Georgia."],
    ],
    areas: [
      ["Riverside and Avondale", "Most of the independent cooking."],
      ["The Beaches", "Seafood, with the honest caveat that proximity to water is not proof of freshness."],
    ],
    searches: ["local shrimp", "fried fish and grits", "camel rider", "somewhere on the water"],
    foods: ["seafood", "bbq", "sandwiches", "breakfast"],
  },
  {
    s: "san-francisco-ca",
    identity: [
      "San Francisco packs more restaurants per resident than almost any US city — the Census puts the county at more than double the national rate — into forty-nine square miles. The result is that you are never far from something excellent, and the constraint is money rather than distance.",
      "Its food history is genuinely inventive: sourdough from Gold Rush bakeries, cioppino from Italian fishermen, the Mission burrito, and a Chinese-American cooking tradition older than almost any other in the country.",
    ],
    dishes: [
      ["Mission burrito", "Rice, beans, meat, wrapped in foil, the size of a forearm. A specific format invented here."],
      ["Sourdough", "The local wild yeast genuinely does produce a different loaf. Not a marketing story."],
      ["Cioppino", "A tomato and seafood stew from the city's Italian fishing community."],
      ["Dim sum", "One of the oldest Chinese communities in the US, and both cart service and made-to-order houses."],
      ["Dungeness crab", "Seasonal, usually winter, and worth arranging a meal around."],
    ],
    areas: [
      ["The Mission", "Taquerias, panaderias and a dense stretch of newer restaurants."],
      ["Chinatown and the Richmond", "The oldest Chinatown in North America, and the Richmond for the food locals actually eat."],
      ["The Tenderloin", "Vietnamese, Cambodian and some of the best value eating in the city."],
    ],
    searches: ["mission burrito", "dim sum, made to order", "dungeness crab in season", "good food under $20"],
    foods: ["mexican-food", "chinese-food", "seafood", "dumplings", "vietnamese-food"],
  },
  {
    s: "columbus-oh",
    identity: [
      "Columbus is where chain restaurants test their new menu items, because its demographics track the national average unusually closely. That is a real and slightly unflattering fact about the city, and it obscures a much more interesting one: it has a large Somali population, a historic German neighbourhood, and its own style of pizza.",
      "Columbus-style pizza is thin, cut into squares, and covered edge to edge with pepperoni that cups and chars. Locals do not think of it as regional. It is.",
    ],
    dishes: [
      ["Columbus-style pizza", "Thin, square-cut, pepperoni to the edge. A genuine regional style with almost no national recognition."],
      ["Somali food", "One of the largest Somali communities in the US. Suqaar, bariis and sambusa are widely available."],
      ["German Village cooking", "Sausage, schnitzel and a preserved 19th-century brick neighbourhood to eat it in."],
      ["The buckeye", "Peanut butter and chocolate confection. Not a meal, but unavoidable."],
      ["Mid-Ohio barbecue and chicken", "A solid, unshowy tradition the city does well."],
    ],
    areas: [
      ["German Village", "Historic, walkable, and the most pleasant dinner district in the city."],
      ["North Columbus / Morse Road", "Somali, Ethiopian, Mexican and Nepali restaurants along one corridor."],
    ],
    searches: ["columbus-style pizza", "somali food", "german village dinner", "cheap lunch near campus"],
    foods: ["pizza", "bbq", "sandwiches", "soup"],
  },
  {
    s: "charlotte-nc",
    identity: [
      "Charlotte grew fast enough that its food scene is mostly newer than its population, which cuts both ways. There is less deep-rooted local tradition here than in eastern North Carolina, and considerably more range, because most of the people cooking arrived from somewhere else.",
      "The barbecue question is genuinely contested. Charlotte sits between Lexington-style — pork shoulder, tomato-and-vinegar dip — and the eastern whole-hog vinegar tradition, and both are available within an hour.",
    ],
    dishes: [
      ["Lexington-style barbecue", "Pork shoulder, red slaw, a thin tomato-and-vinegar dip. The Piedmont tradition, and Lexington is 50 miles away."],
      ["Livermush", "A regional pork-and-cornmeal loaf, sliced and fried. Genuinely local and genuinely divisive."],
      ["Southern meat-and-three", "Protein plus three vegetables, cafeteria style, and still how a lot of the city eats lunch."],
      ["Vietnamese and Indian on Central Avenue", "The most genuinely international corridor in the city."],
      ["Cheerwine and Sun Drop", "Local soft drinks that turn up in barbecue sauces and desserts."],
    ],
    areas: [
      ["Central Avenue / Plaza Midwood", "Vietnamese, Indian, Ethiopian and Mexican."],
      ["South End and NoDa", "Breweries and newer independent kitchens."],
    ],
    searches: ["lexington-style barbecue", "meat and three", "vietnamese on Central", "brewery with good food"],
    foods: ["bbq", "vietnamese-food", "indian-food", "sandwiches"],
  },
  {
    s: "fort-worth-tx",
    identity: [
      "Fort Worth is a cattle town that never stopped being one, and the food follows directly from that. Steak here is not an occasion cuisine imported from elsewhere; it is the local product, and the city's relationship with beef runs through barbecue, Tex-Mex and the chicken-fried steak alike.",
      "It is also noticeably less trend-driven than Dallas thirty miles east, which locals treat as a feature.",
    ],
    dishes: [
      ["Steak", "The Stockyards are a working heritage rather than a theme, and the steakhouse tradition here is the real thing."],
      ["Chicken-fried steak", "Tenderised beef, breaded, fried, under cream gravy. A Texas staple and done seriously here."],
      ["Texas barbecue", "Brisket and beef ribs, salt and pepper, oak."],
      ["Tex-Mex", "An older, plate-based tradition — enchiladas, chile con queso, fajitas."],
      ["Breakfast burritos and tacos", "Daily food, cheap, and available from six in the morning."],
    ],
    areas: [
      ["The Stockyards", "Historic, and better for steak than its tourist reputation suggests."],
      ["Magnolia Avenue", "Where most of the independent kitchens are."],
    ],
    searches: ["steak, properly cooked", "chicken fried steak", "brisket", "breakfast burrito"],
    foods: ["steak", "bbq", "tacos", "mexican-food", "breakfast"],
  },
  {
    s: "detroit-mi",
    identity: [
      "Detroit gave the world a genuinely distinct pizza — rectangular, baked in blue steel automotive parts pans, with cheese pushed to the edges so it caramelises against the wall into a crust. That edge is the entire point, and the style has spread nationally in the last decade.",
      "The other defining fact is Dearborn, immediately west, which has one of the largest Arab-American populations in the country. The Lebanese, Yemeni and Iraqi food in the metro area is among the best in North America.",
    ],
    dishes: [
      ["Detroit-style pizza", "Rectangular, thick, crisp caramelised cheese edge, sauce often ladled on top."],
      ["Coney dog", "Natural casing hot dog, beanless chili, onions, mustard. Two rival coney restaurants sit next door to each other downtown."],
      ["Lebanese and Yemeni food in Dearborn", "Shawarma, mezze, fatteh, and salta. Worth the drive from anywhere in the metro."],
      ["Polish food in Hamtramck", "Pierogi, kielbasa and paczki, especially before Lent."],
      ["Soul food and barbecue", "A deep tradition on the east and west sides."],
    ],
    areas: [
      ["Dearborn", "Arab-American food at a depth found in very few US cities."],
      ["Hamtramck", "Polish, Bangladeshi and Yemeni within a couple of square miles."],
      ["Eastern Market", "A working produce market since 1891."],
    ],
    searches: ["detroit-style pizza", "shawarma in Dearborn", "coney dog", "pierogi in Hamtramck"],
    foods: ["pizza", "mediterranean-food", "sandwiches", "bbq"],
  },
  {
    s: "el-paso-tx",
    identity: [
      "El Paso and Ciudad Juárez are functionally one metropolitan area split by a river, and the food does not recognise the border. This is the oldest continuously settled corner of Texas, and its Mexican food is northern Chihuahuan — beef, wheat flour tortillas, dried chillies — rather than the interior traditions most Americans know.",
      "It also has a strong claim on the origin of the frozen margarita and on nachos, invented just across the border in the 1940s.",
    ],
    dishes: [
      ["Chile relleno and chiles toreados", "Dried and fresh chillies used with more range than almost anywhere in the US."],
      ["Flour tortillas", "Northern Mexican wheat country. Made that morning, and a completely different product from a packet."],
      ["Gorditas and menudo", "Weekend food, and the menudo here is taken seriously."],
      ["Machaca", "Dried, shredded beef, rehydrated and cooked with eggs or chilli. A Chihuahuan staple."],
      ["Nachos", "Invented in Piedras Negras and popularised along this border."],
    ],
    areas: [
      ["Central and south El Paso", "Long-running family restaurants and bakeries."],
      ["The Mission Valley", "Some of the oldest settlements in Texas and the food that goes with them."],
    ],
    searches: ["handmade flour tortillas", "menudo on a Sunday", "chile relleno", "somewhere open late"],
    foods: ["mexican-food", "tacos", "soup", "breakfast"],
  },
  {
    s: "memphis-tn",
    identity: [
      "Memphis barbecue is pork, and the argument here is dry versus wet — ribs rubbed with spice and served without sauce, or ribs mopped and glazed. Both are defensible, both are available, and ordering a half-and-half rack is a normal thing to do.",
      "Beneath the barbecue is one of the strongest soul food traditions in the country, shaped by the Mississippi Delta an hour south and considerably less marketed than the ribs.",
    ],
    dishes: [
      ["Dry-rub ribs", "Spice rub, no sauce, and the style that made the city's name."],
      ["Pulled pork sandwich with slaw", "Slaw on the sandwich, not beside it. This is not optional here."],
      ["Barbecue spaghetti", "Spaghetti in barbecue sauce with chopped pork. A genuine Memphis invention and better than it sounds."],
      ["Soul food", "Fried catfish, greens, cornbread, candied yams. The everyday cooking of the city."],
      ["Hot wings and Delta tamales", "Memphis-style hot wings, and the Delta hot tamale tradition from just downriver."],
    ],
    areas: [
      ["South Memphis and Orange Mound", "Long-running barbecue and soul food."],
      ["Cooper-Young", "Most of the newer independent restaurants."],
    ],
    searches: ["dry rub ribs", "soul food plate", "barbecue spaghetti", "fried catfish"],
    foods: ["bbq", "fried-chicken", "wings", "seafood"],
  },
  {
    s: "seattle-wa",
    identity: [
      "Seattle's food identity is built on cold water and immigration. The Pacific supplies salmon, Dungeness crab, spot prawns and oysters at a quality that genuinely does not travel, and the city's Japanese, Filipino, Vietnamese and Ethiopian communities have been here long enough to shape everyday eating rather than occupy a niche.",
      "It also has a genuinely local fast-food tradition nobody outside the region knows about: Seattle-style teriyaki, served from hundreds of small independent shops since the 1970s.",
    ],
    dishes: [
      ["Oysters", "Cold-water Pacific varieties — Kumamoto, Shigoku, Olympia — each named by the beach they were grown on."],
      ["Seattle teriyaki", "Grilled marinated chicken over rice with a cabbage salad. A local fast-food genre with no national profile."],
      ["Dungeness crab and spot prawns", "Both strictly seasonal and both worth planning around."],
      ["Filipino food", "One of the oldest Filipino communities in the mainland US. Lumpia, adobo, sisig and kamayan."],
      ["Vietnamese in the Chinatown-International District", "Pho and banh mi, and among the best value eating in an expensive city."],
    ],
    areas: [
      ["The Chinatown-International District", "Chinese, Vietnamese, Japanese and Filipino in a few blocks."],
      ["Ballard", "Nordic heritage, seafood, and a good weekend market."],
    ],
    searches: ["oysters, local", "seattle teriyaki", "pho in the ID", "seasonal seafood"],
    foods: ["seafood", "sushi", "pho", "vietnamese-food", "japanese-food"],
  },
  {
    s: "denver-co",
    identity: [
      "Denver's defining ingredient is the green chile — and specifically Pueblo chiles from southern Colorado, which locals will argue are better than New Mexico's Hatch. Denver green chile is a pork-based gravy rather than a stew, ladled over burritos, eggs and fries.",
      "The Census puts Denver County well above the national rate for restaurants per resident, which shows: it is a genuinely well-supplied eating city for its size, helped by a large and long-established Mexican-American population.",
    ],
    dishes: [
      ["Denver green chile", "Pork, roasted green chiles, thickened into a gravy. Poured over almost anything."],
      ["Smothered burrito", "A burrito buried in green chile and cheese, eaten with a fork."],
      ["Pueblo chile", "Southern Colorado's own variety, in season late summer, roasted on street corners."],
      ["Rocky Mountain trout", "Locally caught, simply cooked."],
      ["Brewery food", "One of the densest craft brewing cities in the country, and the kitchens have had to keep up."],
    ],
    areas: [
      ["Federal Boulevard", "Mexican and Vietnamese for miles, and the best value food in the city."],
      ["RiNo and Five Points", "Newer independent kitchens and breweries."],
    ],
    searches: ["green chile, pork", "smothered burrito", "pho on Federal", "brewery with real food"],
    foods: ["mexican-food", "tacos", "pho", "burgers", "soup"],
  },
  {
    s: "washington-dc",
    identity: [
      "Washington has the largest Ethiopian population outside Ethiopia, and that is the single most important fact about eating here. Injera, doro wat, kitfo and tibs are everyday food in this city in a way they are nowhere else in the Western hemisphere.",
      "It also has a genuine native street food in the half-smoke, and a local condiment — mumbo sauce — that exists almost nowhere else and that most visitors never encounter.",
    ],
    dishes: [
      ["Ethiopian food", "Injera, doro wat, kitfo, and vegetarian fasting platters that are among the best vegan meals in the country."],
      ["Half-smoke", "A coarse, half-pork half-beef smoked sausage, split and griddled, with chilli and onions. Genuinely local."],
      ["Mumbo sauce", "A sweet-tangy red sauce served with fried chicken and wings. A DC creation."],
      ["Chesapeake blue crab", "Steamed with Old Bay, eaten with a mallet on newspaper. Seasonal, and closer to Baltimore's tradition."],
      ["Salvadoran pupusas", "A very large Salvadoran community, and pupuserias throughout the region."],
    ],
    areas: [
      ["Shaw and U Street", "The historic heart of Ethiopian Washington, and where the half-smoke is from."],
      ["Columbia Heights and Mount Pleasant", "Salvadoran, Mexican and Caribbean."],
    ],
    searches: ["ethiopian fasting platter", "half-smoke", "pupusas", "quiet enough for a work dinner"],
    foods: ["mediterranean-food", "sandwiches", "seafood", "fried-chicken"],
  },
  {
    s: "boston-ma",
    identity: [
      "Boston is a cold-water seafood city with an Italian-American neighbourhood at its centre, and its food is at its best when it is least elaborate: a lobster roll, a plate of fried clams, a bowl of chowder made with cream and not flour.",
      "The city also eats considerably more diversely than its reputation suggests — there are large Brazilian, Haitian, Vietnamese, Dominican and Cape Verdean communities, most of them outside the neighbourhoods visitors walk through.",
    ],
    dishes: [
      ["Lobster roll", "Two schools: cold with mayonnaise, or warm with butter. Both legitimate; pick a side."],
      ["Whole-belly fried clams", "Not strips. The bellies are the whole point and the difference is substantial."],
      ["New England clam chowder", "Cream-based, never tomato, and it should not be thick enough to stand a spoon in."],
      ["North End Italian-American", "Red sauce cooking with a century behind it, plus the pastry shops."],
      ["Roast beef sandwiches", "A North Shore speciality — thin-sliced rare beef on an onion roll — barely known outside the region."],
    ],
    areas: [
      ["The North End", "Italian-American, dense, walkable, and worth the crowds."],
      ["Dorchester", "Vietnamese along Dorchester Avenue, plus Haitian and Cape Verdean cooking."],
      ["East Boston", "Salvadoran, Colombian and Mexican."],
    ],
    searches: ["lobster roll, warm with butter", "whole belly clams", "pho in Dorchester", "north end dinner"],
    foods: ["seafood", "italian-food", "pho", "sandwiches", "soup"],
  },
  {
    s: "nashville-tn",
    identity: [
      "Nashville hot chicken is a real dish with a specific origin story, a specific technique — fried chicken painted with a cayenne-and-lard paste, served on white bread with pickles — and a heat level that is not a marketing exercise. The bread is not a garnish; it soaks the fat and is frequently the best part.",
      "Underneath that is the meat-and-three, the everyday Southern lunch format of one protein and three vegetable sides, which is how much of the city actually eats and which almost no visitor tries.",
    ],
    dishes: [
      ["Hot chicken", "Start below the heat level you think you want. The scale here is genuine."],
      ["Meat-and-three", "Cafeteria-style Southern lunch. The vegetables are the point, and 'vegetables' includes macaroni cheese."],
      ["Biscuits", "Buttermilk, tall, flaky, and taken seriously."],
      ["Kurdish food", "Nashville has the largest Kurdish population in the US, concentrated in the south of the city."],
      ["Goo Goo Cluster", "A local confection, invented here in 1912."],
    ],
    areas: [
      ["East Nashville", "Most of the newer independent kitchens."],
      ["Nolensville Pike", "Kurdish, Mexican, Ethiopian and Vietnamese for several miles. The best eating corridor in the city."],
    ],
    searches: ["hot chicken, medium", "meat and three", "kurdish food on Nolensville", "biscuits for breakfast"],
    foods: ["fried-chicken", "bbq", "breakfast", "mediterranean-food"],
  },
  {
    s: "baltimore-md",
    identity: [
      "Baltimore's food is Chesapeake food, and the blue crab organises everything. Steamed crabs covered in Old Bay, eaten with a wooden mallet on a table covered in brown paper, is a communal ritual rather than a meal, and it runs from spring to autumn.",
      "The city also has two under-known local dishes — pit beef and lake trout — that have nothing to do with the harbour and everything to do with how Baltimore actually eats.",
    ],
    dishes: [
      ["Steamed blue crabs", "Old Bay, mallets, brown paper, several hours. Seasonal and worth planning around."],
      ["Crab cake", "Jumbo lump, barely any filler, broiled rather than fried. Filler is the tell."],
      ["Pit beef", "Charcoal-grilled top round, sliced thin and rare, on a kaiser roll with horseradish and raw onion. A roadside tradition."],
      ["Lake trout", "Not trout and not from a lake — it is fried whiting, served on white bread. A genuine Baltimore institution."],
      ["Berger cookies", "A local cookie under an improbable amount of chocolate fudge."],
    ],
    areas: [
      ["Lexington Market", "Trading since 1782, and where lake trout is best understood."],
      ["Hampden and Highlandtown", "Independent kitchens, plus Greek and Latin American cooking in the southeast."],
    ],
    searches: ["steamed crabs by the dozen", "crab cake, no filler", "pit beef", "somewhere for a group"],
    foods: ["seafood", "sandwiches", "greek-food", "bbq"],
  },
  {
    s: "oklahoma-city-ok",
    identity: [
      "Oklahoma City's signature dish is the onion burger, and it came out of the Depression: onions sliced paper-thin and smashed into the patty on the griddle to stretch the meat. It stayed because it turned out to be better than the burger it was economising on.",
      "The city also has a substantial Vietnamese community concentrated in the Asian District, dating to refugee resettlement in the 1970s, and the pho and banh mi there are excellent and very cheap.",
    ],
    dishes: [
      ["Onion burger", "Thin-sliced onions smashed into the patty on the griddle. A Depression-era economy that became the better burger."],
      ["Chicken-fried steak", "Oklahoma takes this as seriously as Texas and argues about it just as much."],
      ["Vietnamese in the Asian District", "Pho, banh mi and bun bo Hue along Classen Boulevard."],
      ["Barbecue", "Between Texas beef and Kansas City sweetness, and it draws from both."],
      ["Indian tacos and frybread", "Substantial Native American population and a genuine local food tradition."],
    ],
    areas: [
      ["The Asian District", "Vietnamese, Chinese and Korean along Classen."],
      ["Plaza District and Paseo", "Newer independent restaurants."],
    ],
    searches: ["onion burger", "pho in the Asian District", "chicken fried steak", "barbecue, sliced beef"],
    foods: ["burgers", "pho", "bbq", "vietnamese-food"],
  },
  {
    s: "louisville-ky",
    identity: [
      "Louisville sits on the line between the Midwest and the South and eats like both. Its best-known dish, the Hot Brown, is an open-faced turkey sandwich under Mornay sauce and bacon, invented at a hotel in 1926 to feed people at two in the morning — which tells you something about the city.",
      "Bourbon shapes the rest. It is in the sauces, the desserts and the restaurant culture, and the distilleries within an hour have made the city a genuine food destination in the last two decades.",
    ],
    dishes: [
      ["Hot Brown", "Turkey, Mornay, bacon, tomato, under a broiler. Heavy by design and best late."],
      ["Burgoo", "A long-cooked stew of several meats and whatever vegetables are around. A Kentucky tradition."],
      ["Beer cheese", "A sharp cheddar and beer spread, served with crackers and pickles. Genuinely local."],
      ["Benedictine", "A cucumber and cream cheese spread, pale green, invented here."],
      ["Bourbon, and food cooked with it", "Pecan pie, glazes, sauces. Not a gimmick in this city."],
    ],
    areas: [
      ["NuLu and Butchertown", "Most of the newer independent kitchens."],
      ["The Highlands", "A long strip of bars and restaurants, and the city's main eating street."],
    ],
    searches: ["hot brown", "beer cheese and bourbon", "somewhere on Bardstown Road", "late night food"],
    foods: ["sandwiches", "bbq", "steak", "soup"],
  },
  {
    s: "portland-or",
    identity: [
      "Portland has the highest restaurant density of any city on this list outside New York and San Francisco — the Census puts Multnomah County well above thirty food businesses per ten thousand residents — and a disproportionate share of it comes out of carts.",
      "The food cart pods here are not a novelty or a summer thing. They are permanent, they have serious kitchens in them, and some of the best cooking in the city happens in a trailer in a gravel lot with a shared seating tent.",
    ],
    dishes: [
      ["Food cart cooking", "Pods across the city, open year-round, covering everything from Georgian khachapuri to Thai to Venezuelan."],
      ["Pacific Northwest seafood", "Dungeness crab, razor clams, salmon, oysters. Cold-water and seasonal."],
      ["Thai food, at real heat", "Portland has an unusually strong Thai restaurant culture and will cook to actual Thai spice levels."],
      ["Voodoo-style and artisan doughnuts", "A genuine local obsession, at both ends of the seriousness scale."],
      ["Farm-to-table, meant literally", "The Willamette Valley is close enough that seasonal menus change in real time."],
    ],
    areas: [
      ["Southeast Division and Hawthorne", "Dense independent restaurants and several cart pods."],
      ["82nd Avenue", "Vietnamese, Chinese, Mexican and Korean — the best value corridor in the city."],
    ],
    searches: ["food cart pod", "thai, actually spicy", "dungeness crab", "great vegan options"],
    foods: ["thai-food", "seafood", "vietnamese-food", "brunch", "salad"],
  },
  {
    s: "las-vegas-nv",
    identity: [
      "Las Vegas has two completely separate food cities. On the Strip there is the highest concentration of celebrity-chef restaurants in the world, priced accordingly. A few miles west on Spring Mountain Road there is Chinatown — which is not primarily Chinese but pan-Asian — and it is where the people who work in those kitchens eat after their shifts.",
      "It is also the best 24-hour eating city in the country by a wide margin, because the workforce is on shifts around the clock and demand at four in the morning is real.",
    ],
    dishes: [
      ["Late-night everything", "Ramen, Korean barbecue, dim sum and Thai served at hours that would be impossible anywhere else."],
      ["Spring Mountain Road Asian food", "Japanese, Korean, Chinese, Thai, Vietnamese and Filipino along a few miles."],
      ["Celebrity-chef tasting menus", "Genuinely accomplished, genuinely expensive, and worth one visit if the budget is there."],
      ["The buffet", "A real Vegas institution, best treated as a format rather than a guarantee of quality."],
      ["Shrimp cocktail and steak, old-school", "The pre-1990s Vegas tradition still survives downtown."],
    ],
    areas: [
      ["Spring Mountain Road (Chinatown)", "Where the hospitality workforce actually eats."],
      ["Downtown and the Arts District", "Independent kitchens away from the Strip."],
    ],
    searches: ["open at 3am", "korean barbecue on Spring Mountain", "somewhere off the Strip", "big group dinner"],
    foods: ["korean-food", "ramen", "japanese-food", "steak", "chinese-food"],
  },
  {
    s: "milwaukee-wi",
    identity: [
      "The Friday fish fry is the organising ritual of eating in Milwaukee. It is not a restaurant special; it is a citywide weekly event with Catholic and German roots, served in supper clubs, taverns, church halls and bowling alleys, usually cod or perch with potato pancakes and rye bread.",
      "The city's German brewing heritage also produced a bratwurst culture and a frozen custard tradition that is denser and richer than ice cream and fiercely defended.",
    ],
    dishes: [
      ["Friday fish fry", "Cod, perch or walleye, fried, with potato pancakes, coleslaw and rye. A weekly institution."],
      ["Bratwurst", "Simmered in beer and onions, then grilled. Served with a hard roll and stadium mustard."],
      ["Frozen custard", "Egg yolk in the base makes it denser than ice cream. The flavour of the day is a real system."],
      ["Supper club dining", "Old Fashioneds, relish trays, prime rib. A Wisconsin format worth understanding before you go."],
      ["Cheese curds", "Fresh ones squeak. Fried ones are the bar version and also correct."],
    ],
    areas: [
      ["Bay View", "Most of the newer independent kitchens."],
      ["The Historic Third Ward", "Public market and a dense restaurant strip."],
    ],
    searches: ["friday fish fry", "supper club prime rib", "frozen custard", "bratwurst and a beer"],
    foods: ["seafood", "burgers", "sandwiches", "brunch"],
  },
  {
    s: "albuquerque-nm",
    identity: [
      "New Mexican food is a distinct cuisine, not a variant of Mexican or Tex-Mex, and Albuquerque is its largest city. It is built on the state's own chile — grown in Hatch and elsewhere in the Rio Grande valley — and the defining question you will be asked with almost any order is 'red or green?'",
      "The correct answer, if you want both, is 'Christmas'. It is the official state question, which tells you how seriously this is taken.",
    ],
    dishes: [
      ["Green chile", "Roasted, peeled, chopped, and put on everything — burgers, eggs, stew, pizza. Nothing else tastes like it."],
      ["Red chile", "Dried, ground into a sauce. Deeper and earthier than green, and a different dish rather than a hotter one."],
      ["Sopaipillas", "Puffed fried bread, served with honey, and used to cool your mouth between bites."],
      ["Carne adovada", "Pork slow-braised in red chile. The best test of a New Mexican kitchen."],
      ["Green chile cheeseburger", "A statewide institution with an official trail dedicated to it."],
    ],
    areas: [
      ["The North and South Valley", "Long-running family New Mexican restaurants."],
      ["Nob Hill and Old Town", "Walkable, and where most visitors start."],
    ],
    searches: ["green chile cheeseburger", "carne adovada", "christmas, red and green", "sopaipillas with honey"],
    foods: ["mexican-food", "burgers", "tacos", "soup"],
  },
  {
    s: "tucson-az",
    identity: [
      "Tucson was named the first UNESCO City of Gastronomy in the United States, and the case rested on something genuinely unusual: it has the longest continuously farmed land in the country, with heritage crops — tepary beans, White Sonora wheat, cholla buds — still in use.",
      "In practice that means Sonoran Mexican cooking with roots going back centuries, and a flour tortilla tradition that is the best in the United States.",
    ],
    dishes: [
      ["Sonoran hot dog", "Bacon-wrapped, beans, tomato, onion, mayonnaise, jalapeño salsa. Tucson's best-known street food."],
      ["Carne seca", "Beef dried in the desert air, then shredded and cooked. A Tucson speciality that barely exists elsewhere."],
      ["Flour tortillas", "Large, thin to the point of translucency, made by hand. Genuinely exceptional here."],
      ["Chimichanga", "Claimed by Tucson, and the claim is taken seriously."],
      ["Heritage grain and desert ingredients", "White Sonora wheat, tepary beans, mesquite flour, prickly pear."],
    ],
    areas: [
      ["South Tucson", "A separate incorporated city inside Tucson, and the heart of its Mexican food."],
      ["Fourth Avenue and downtown", "Student-priced and independent kitchens."],
    ],
    searches: ["sonoran hot dog", "carne seca", "handmade flour tortillas", "cheap eats near campus"],
    foods: ["mexican-food", "tacos", "burgers", "breakfast"],
  },
  {
    s: "fresno-ca",
    identity: [
      "Fresno sits in the middle of the most productive agricultural region on earth, and the interesting consequence is not farm-to-table restaurants — it is who came to farm. The city has one of the largest Hmong populations in the US, a century-old Armenian community, a very large Mexican-American population, and Punjabi Sikh families who have farmed here for generations.",
      "The Census rate for restaurants per resident here is below the national median, which is real: this is a city where you need to know where to go rather than one where you can wander.",
    ],
    dishes: [
      ["Hmong food", "Larb, papaya salad, sausage and boiled greens. The Saturday Hmong market is the best introduction."],
      ["Armenian food", "Lahmajun, kufta, string cheese. One of the oldest Armenian communities in the country."],
      ["Punjabi food", "Roti, saag, and dhabas along the highways serving farm workers."],
      ["Taquerias and mariscos", "Central Valley Mexican cooking, and the seafood is better than a landlocked city suggests."],
      ["Central Valley produce", "Stone fruit, grapes, almonds, in season and genuinely better here."],
    ],
    areas: [
      ["The Tower District", "Most of the independent restaurants."],
      ["Southeast Fresno", "Hmong and Southeast Asian markets and kitchens."],
    ],
    searches: ["hmong food", "armenian lahmajun", "punjabi dhaba", "mariscos"],
    foods: ["thai-food", "mediterranean-food", "indian-food", "mexican-food", "seafood"],
  },
  {
    s: "sacramento-ca",
    identity: [
      "Sacramento calls itself America's Farm-to-Fork Capital, and unlike most such slogans it has the geography to back it: the city sits inside the Sacramento Valley, one of the most productive growing regions in the country, and restaurants genuinely buy within a few miles.",
      "It also has deep Hmong, Mien, Ukrainian and Mexican communities, and a Japanese-American history that predates the war and survived internment.",
    ],
    dishes: [
      ["Seasonal produce cooking", "Menus that change with what the valley is picking, which is most of the year."],
      ["Hmong and Mien food", "Concentrated in south Sacramento, and among the best value eating in the city."],
      ["Mexican and mariscos", "A long-established community with taquerias, birrierias and seafood."],
      ["Ukrainian and Slavic food", "A large post-Soviet community, with bakeries and delis to match."],
      ["Delta and river fish", "Sturgeon and striped bass from the Sacramento-San Joaquin delta."],
    ],
    areas: [
      ["Midtown", "The densest restaurant district and the most walkable."],
      ["Stockton Boulevard", "Vietnamese, Hmong, Mexican and Middle Eastern."],
    ],
    searches: ["farm to fork, seasonal", "hmong food", "birria", "somewhere with a patio"],
    foods: ["salad", "vietnamese-food", "mexican-food", "tacos", "seafood"],
  },
  {
    s: "long-beach-ca",
    identity: [
      "Long Beach has the largest Cambodian population outside Cambodia, and Cambodia Town along Anaheim Street is the only officially designated one in the United States. Khmer food — num banh chok, amok, kuy teav, prahok — is available here at a depth found nowhere else in the country.",
      "The city is also a working port with a long Mexican-American history, so the food is considerably less beach-resort than the coastline suggests.",
    ],
    dishes: [
      ["Cambodian food", "Amok, kuy teav noodle soup, num banh chok, and grilled meats with tuk trey. The reason to eat here."],
      ["Mexican, in the north and west", "Long-established taquerias and mariscos rather than tourist Mexican."],
      ["Filipino food", "A substantial community, with lechon and kamayan spreads."],
      ["Seafood, from the port", "Straightforward and unfussy rather than resort-priced."],
      ["Pacific Island cooking", "Samoan and Tongan communities and the food that comes with them."],
    ],
    areas: [
      ["Cambodia Town, Anaheim Street", "The densest Khmer food district in the US."],
      ["Retro Row and downtown", "Independent kitchens and cafés."],
    ],
    searches: ["cambodian amok", "kuy teav", "mariscos", "cheap lunch"],
    foods: ["noodles", "soup", "mexican-food", "seafood", "thai-food"],
  },
  {
    s: "kansas-city-mo",
    identity: [
      "Kansas City barbecue is the most inclusive of the American regional styles — it smokes everything rather than specialising in one animal — and it is defined by a thick, sweet, tomato-and-molasses sauce that the other barbecue regions regard with suspicion.",
      "Its great contribution is burnt ends: the fatty point end of the brisket, cubed and returned to the smoker until the edges caramelise. They were once given away and are now frequently the most expensive thing on the menu.",
    ],
    dishes: [
      ["Burnt ends", "Cubed brisket point, twice-smoked, caramelised. A Kansas City invention and the thing to order."],
      ["Sauced ribs", "Thick, sweet, tomato-and-molasses. A different proposition from Memphis or Texas."],
      ["Smoked everything", "Turkey, sausage, chicken, pork, beef. The style's defining breadth."],
      ["Burger and steak tradition", "A cattle-town history that predates the barbecue fame."],
      ["Strip District and market cooking", "The City Market has traded since the 1850s."],
    ],
    areas: [
      ["The 18th and Vine district", "Jazz history and long-running barbecue."],
      ["Westside and the River Market", "Mexican bakeries and taquerias, plus independent restaurants."],
    ],
    searches: ["burnt ends", "ribs, sauced", "somewhere for a big group", "barbecue without the queue"],
    foods: ["bbq", "burgers", "steak", "sandwiches"],
  },
  {
    s: "mesa-az",
    identity: [
      "Mesa is part of the Phoenix metropolitan area and eats Sonoran like the rest of it, but it has its own character: a large and long-established Mormon population that shaped the city's early food culture, and more recently substantial Brazilian, Somali and Middle Eastern communities.",
      "In practice that means the Mexican food is northern Sonoran — flour tortillas, beef, dried chillies — and the rest is more varied than the suburban layout suggests.",
    ],
    dishes: [
      ["Sonoran Mexican", "Flour tortillas, carne asada, machaca. Northern Mexican rather than interior."],
      ["Sonoran hot dog", "Bacon-wrapped, beans, jalapeño salsa. A metro-wide institution."],
      ["Brazilian churrascaria", "A substantial Brazilian community, and rodizio grills to match."],
      ["Middle Eastern and Somali", "Concentrated in west Mesa, and consistently under-visited."],
      ["Citrus", "The valley's original crop, still grown and still in season in winter."],
    ],
    areas: [
      ["Main Street and downtown Mesa", "Mexican bakeries, taquerias and newer independents."],
      ["West Mesa", "Somali, Middle Eastern and Brazilian restaurants."],
    ],
    searches: ["sonoran hot dog", "carne asada", "brazilian churrascaria", "somewhere with air conditioning"],
    foods: ["mexican-food", "tacos", "steak", "mediterranean-food"],
  },
  {
    s: "virginia-beach-va",
    identity: [
      "Virginia Beach is a Chesapeake and Atlantic city, and the food that matters here comes out of the water: blue crab, oysters from the bay and the seaside, rockfish, and the Virginia ham tradition from inland.",
      "The military presence also shapes it. This is a large Navy region, which has brought Filipino food here in real depth — one of the largest Filipino-American populations in the country lives in Hampton Roads.",
    ],
    dishes: [
      ["Chesapeake blue crab", "Steamed with Old Bay, or in crab cakes with minimal filler. Seasonal."],
      ["Virginia oysters", "The bay and seaside grow distinctly different oysters, and good places name the water."],
      ["Filipino food", "Lumpia, adobo, pancit and kamayan. A major community and a genuine local cuisine."],
      ["Virginia ham", "Salt-cured, aged, intensely savoury. Sliced thin on a biscuit is the way in."],
      ["She-crab soup", "A Lowcountry-Chesapeake crossover, rich with crab roe and sherry."],
    ],
    areas: [
      ["The Oceanfront", "Tourist-facing, so choose carefully rather than by proximity to the sand."],
      ["Shore Drive and Chesapeake Bay side", "Where the seafood places locals use tend to be."],
    ],
    searches: ["local oysters", "steamed crabs", "filipino lumpia", "seafood away from the boardwalk"],
    foods: ["seafood", "soup", "sandwiches", "bbq"],
  },
  {
    s: "atlanta-ga",
    identity: [
      "Atlanta has two food identities running in parallel. There is the Southern one — fried chicken, soul food, meat-and-threes, biscuits — which is deep and still central. And there is Buford Highway, a corridor northeast of the city that is one of the most concentrated immigrant food districts in the United States.",
      "Buford Highway alone contains Vietnamese, Korean, Chinese, Mexican, Salvadoran, Ethiopian and Bangladeshi restaurants across a few miles of strip malls, and it is the single best reason to eat here.",
    ],
    dishes: [
      ["Lemon pepper wings", "An Atlanta institution, ordered 'lemon pepper wet' — sauced as well as seasoned."],
      ["Soul food", "Fried chicken, collards, mac and cheese, cornbread. Long-running and still the city's heart."],
      ["Buford Highway Asian and Latin food", "Korean, Vietnamese, Chinese, Salvadoran and Mexican, at depth."],
      ["Biscuits and Southern breakfast", "Buttermilk biscuits, country ham, grits."],
      ["Peaches, in season", "Genuinely better here, and briefly."],
    ],
    areas: [
      ["Buford Highway", "The best eating corridor in the Southeast."],
      ["West End and the Old Fourth Ward", "Soul food, vegan Southern cooking, and newer independents."],
    ],
    searches: ["lemon pepper wet wings", "soul food plate", "korean on Buford Highway", "vegan southern food"],
    foods: ["fried-chicken", "wings", "korean-food", "vietnamese-food", "breakfast"],
  },
  {
    s: "colorado-springs-co",
    identity: [
      "Colorado Springs eats like a mountain military town, which is exactly what it is — five major installations, the Air Force Academy, and a population that turns over regularly. That has left it with more range than a city this size usually has and less of a single tradition.",
      "It shares Colorado's green chile culture with Denver, and Pueblo — the source of the state's own chile variety — is only forty miles south.",
    ],
    dishes: [
      ["Pueblo green chile", "From the Arkansas Valley just south. Thinner and hotter than the New Mexican style."],
      ["Smothered burritos", "Green chile poured over, eaten with a fork."],
      ["Korean food", "A substantial community tied to the military presence, and better than the city's size suggests."],
      ["Brewery and mountain-town food", "Substantial, unfussy, and built for people who have been outside all day."],
      ["Bison and game", "Locally available and on more menus here than most places."],
    ],
    areas: [
      ["Old Colorado City and downtown", "Most of the independent kitchens."],
      ["Academy Boulevard", "Korean, Vietnamese and Mexican along the corridor."],
    ],
    searches: ["pueblo green chile", "korean food", "big portions after a hike", "brewery with real food"],
    foods: ["mexican-food", "korean-food", "burgers", "bbq"],
  },
  {
    s: "omaha-ne",
    identity: [
      "Omaha is a beef city with a stockyards history, and its steakhouse tradition is the genuine article rather than an imported format. It also has a plausible claim on the Reuben sandwich, said to have been created at a hotel here in the early twentieth century — contested by New York, as these things always are.",
      "Less contested is the Runza, a Nebraska-specific bread pocket of beef, cabbage and onion, brought by Volga German immigrants and now a regional chain.",
    ],
    dishes: [
      ["Steak", "A stockyards city, and the steakhouses are long-running and unpretentious."],
      ["Reuben", "Corned beef, sauerkraut, Swiss, Russian dressing, grilled rye. Omaha's claim is a real one."],
      ["Runza", "Beef, cabbage and onion baked inside bread. Volga German in origin and specific to Nebraska."],
      ["Czech and Volga German food", "Kolaches and sausages from the surrounding farm communities."],
      ["Sudanese and South Sudanese food", "A significant refugee community, and one of the largest in the US."],
    ],
    areas: [
      ["The Old Market", "Cobbled, walkable, and the main restaurant district."],
      ["South Omaha", "Mexican and Central American, plus the stockyards history."],
    ],
    searches: ["steak, dry aged", "reuben sandwich", "runza", "somewhere in the Old Market"],
    foods: ["steak", "sandwiches", "burgers", "bbq"],
  },
  {
    s: "raleigh-nc",
    identity: [
      "Raleigh sits in eastern North Carolina barbecue country, which means whole hog, chopped, dressed with nothing but vinegar, salt and pepper. No tomato. This is a genuine regional boundary and people take it seriously — Lexington-style, from the Piedmont, is a different and rival tradition.",
      "The Research Triangle has also brought a large and well-paid international population, so the range here is wider than in most Southern cities of this size.",
    ],
    dishes: [
      ["Eastern NC whole hog barbecue", "Chopped, vinegar-and-pepper dressed, no tomato. Served with hushpuppies and slaw."],
      ["Fried chicken and biscuits", "Buttermilk-brined, and a strong biscuit tradition alongside."],
      ["Calabash seafood", "Lightly battered fried seafood, from a fishing village on the state's southern coast."],
      ["Cheerwine and sweet tea", "Local soft drink and an absolutely standard accompaniment."],
      ["Indian and East Asian in Cary and Morrisville", "Substantial communities and some of the best South Indian food in the region."],
    ],
    areas: [
      ["Downtown and Glenwood South", "Most of the independent kitchens."],
      ["Cary and Morrisville", "South Indian, Chinese and Korean at real depth."],
    ],
    searches: ["eastern nc barbecue", "dosa in Morrisville", "fried chicken and biscuits", "quiet business dinner"],
    foods: ["bbq", "fried-chicken", "indian-food", "seafood"],
  },
  {
    s: "miami-fl",
    identity: [
      "Miami is a Latin American city that happens to be in the United States, and its food follows accordingly. Cuban cooking is the foundation — the city has the largest Cuban population outside Cuba — but Haitian, Venezuelan, Colombian, Peruvian, Nicaraguan and Argentine communities all cook here at depth.",
      "The ritual that organises the day is the cafecito: a small, very sweet espresso taken standing at a ventanita, the walk-up window on the side of a Cuban café, several times a day.",
    ],
    dishes: [
      ["Cuban sandwich", "Roast pork, ham, Swiss, pickles, mustard, pressed. The Miami version omits the salami Tampa insists on."],
      ["Cafecito and pastelitos", "Sweet espresso at a ventanita, with guava pastry. A daily ritual rather than a treat."],
      ["Ropa vieja and lechon asado", "The Cuban main-course canon, with black beans, rice and plantains."],
      ["Haitian griot", "Marinated fried pork with pikliz. Little Haiti is one of the largest Haitian communities in the US."],
      ["Peruvian ceviche and Venezuelan arepas", "Both widely available and both excellent here."],
    ],
    areas: [
      ["Little Havana, Calle Ocho", "Cuban cafés, ventanitas and long-running restaurants."],
      ["Little Haiti", "Griot, legim and Haitian bakeries."],
      ["Doral and Sweetwater", "Venezuelan and Colombian at real depth."],
    ],
    searches: ["cuban sandwich", "cafecito and pastelitos", "haitian griot", "arepas in Doral"],
    foods: ["sandwiches", "seafood", "breakfast", "steak"],
  },
  {
    s: "oakland-ca",
    identity: [
      "Oakland is more diverse than San Francisco across the bay, considerably cheaper, and has a stronger claim to the Bay Area's best everyday eating. Its food is Mexican, Ethiopian, Cambodian, Vietnamese, Yemeni and Southern soul food, largely in neighbourhood restaurants rather than destination ones.",
      "It also has a genuine Black culinary tradition dating to the Second World War migration, which produced a soul food and barbecue culture that still defines large parts of the city.",
    ],
    dishes: [
      ["Soul food and barbecue", "West Oakland's tradition, from the wartime migration, and still central."],
      ["Ethiopian and Eritrean", "A large community, and vegetarian fasting platters that are among the best value meals anywhere."],
      ["Cambodian and Vietnamese", "Concentrated in the international corridor along East 12th and International Boulevard."],
      ["Mexican, in the Fruitvale", "Taquerias, birria and mariscos, and the best value food in the Bay Area."],
      ["Yemeni coffee and food", "A growing community and a distinct coffee tradition."],
    ],
    areas: [
      ["The Fruitvale", "Mexican and Central American at depth."],
      ["Temescal and Uptown", "Ethiopian, Korean and newer independent kitchens."],
    ],
    searches: ["ethiopian veggie combo", "birria in the Fruitvale", "soul food", "cheap and great"],
    foods: ["mexican-food", "tacos", "mediterranean-food", "vietnamese-food", "fried-chicken"],
  },
  {
    s: "minneapolis-mn",
    identity: [
      "Minneapolis has the largest Somali population in North America, and East African food here is everyday food rather than a speciality. It also has large Hmong, Oromo, Ethiopian, Mexican and Vietnamese communities, which together make it far more varied than its Scandinavian reputation suggests.",
      "Its own contribution to the American canon is the Juicy Lucy: a burger with the cheese sealed inside the patty, so it melts into a molten core. Two neighbouring bars have claimed the invention for decades and neither is backing down.",
    ],
    dishes: [
      ["Juicy Lucy", "Cheese sealed inside the patty. Wait before biting; the inside is genuinely molten."],
      ["Somali food", "Suqaar, bariis iskukaris, sambusa. Widely available and central to the city's eating."],
      ["Hmong food", "The farmers' markets here have a strong Hmong presence, and the food follows."],
      ["Scandinavian baking and fish", "Lefse, cardamom buns, lutefisk at Christmas if you are brave."],
      ["Walleye", "The state fish, usually fried or pan-seared. A genuine regional staple."],
    ],
    areas: [
      ["Cedar-Riverside", "Somali and East African restaurants and cafés."],
      ["Eat Street (Nicollet Avenue)", "Vietnamese, Mexican, Ethiopian and Greek along one stretch."],
    ],
    searches: ["juicy lucy", "somali food", "walleye", "somewhere warm on a cold night"],
    foods: ["burgers", "seafood", "mediterranean-food", "vietnamese-food"],
  },
  {
    s: "tulsa-ok",
    identity: [
      "Tulsa's food history runs through oil money and Route 66, which left it with more art deco dining rooms and roadside institutions than a city this size would normally have. Its everyday eating is Oklahoma barbecue, chicken-fried steak and an increasingly substantial Mexican community in the east of the city.",
      "It also has a significant Native American population — the city sits on Muscogee Nation land — and indigenous food traditions are present in a way they are not in most US cities.",
    ],
    dishes: [
      ["Oklahoma barbecue", "Between Texas beef and Kansas City sauce, and it borrows from both."],
      ["Chicken-fried steak", "Breaded, fried, cream gravy. A daily staple, not a novelty."],
      ["Indian tacos and frybread", "A genuine local tradition tied to the region's Native population."],
      ["Mexican on East 21st and Garnett", "A growing community with taquerias and panaderias."],
      ["Route 66 roadside cooking", "Burgers, pies and diners along the original alignment."],
    ],
    areas: [
      ["The Pearl District and Brady Arts District", "Newer independent restaurants."],
      ["East Tulsa", "Mexican, Burmese and Vietnamese."],
    ],
    searches: ["oklahoma barbecue", "chicken fried steak", "indian taco", "route 66 diner"],
    foods: ["bbq", "steak", "burgers", "tacos"],
  },
  {
    s: "cleveland-oh",
    identity: [
      "Cleveland is an Eastern European city on a Great Lake, and its food still reflects the Polish, Hungarian, Slovenian and Czech communities that built it. Pierogi are not a novelty item here; they are on the menu at diners, bars and stadiums.",
      "The city's own invention is the Polish Boy — a kielbasa in a bun under french fries, coleslaw and barbecue sauce — which is structurally absurd and completely successful.",
    ],
    dishes: [
      ["Polish Boy", "Kielbasa, fries, coleslaw and barbecue sauce in a bun. A genuine Cleveland creation."],
      ["Pierogi", "Potato and cheese, butter and onions. Available everywhere and taken seriously."],
      ["Hungarian and Slovenian food", "Paprikash, stuffed cabbage, klobasa. Long-running neighbourhood restaurants."],
      ["Lake Erie perch and walleye", "Freshwater fish, usually fried, and a Friday staple."],
      ["Corned beef sandwiches", "An oversized deli tradition from the city's Jewish delis."],
    ],
    areas: [
      ["The West Side Market", "Trading since 1912, and the best single introduction to the city's food."],
      ["Tremont and Ohio City", "Most of the newer independent kitchens."],
      ["Slavic Village and Parma", "Polish and Eastern European at depth."],
    ],
    searches: ["polish boy", "pierogi", "lake perch fry", "west side market lunch"],
    foods: ["sandwiches", "dumplings", "seafood", "soup"],
  },
  {
    s: "wichita-ks",
    identity: [
      "Wichita's contribution to American food is mostly corporate and mostly invisible: White Castle was founded here in 1921 and Pizza Hut in 1958. The city itself eats in a much more interesting way than that history suggests.",
      "There is a large Vietnamese community from 1970s resettlement, a growing Mexican population, and a genuinely strong barbecue tradition that borrows from Kansas City to the east and Texas to the south.",
    ],
    dishes: [
      ["Kansas barbecue", "Between Kansas City sweetness and Texas beef, with burnt ends widely available."],
      ["Vietnamese on North Broadway", "Pho and banh mi from a community established here since the 1970s."],
      ["Chicken-fried steak", "A plains staple, and well done here."],
      ["Bierocks", "Beef, cabbage and onion baked in bread. The Kansas cousin of Nebraska's runza, from the same Volga German origin."],
      ["Mexican in the north end", "Taquerias and panaderias serving a growing community."],
    ],
    areas: [
      ["Old Town and Delano", "Independent restaurants and bars."],
      ["North Broadway", "Vietnamese and Southeast Asian."],
    ],
    searches: ["burnt ends", "pho on Broadway", "bierocks", "chicken fried steak"],
    foods: ["bbq", "pho", "steak", "burgers"],
  },
  {
    s: "arlington-tx",
    identity: [
      "Arlington sits between Dallas and Fort Worth and has historically been defined by what is next to it — two major stadiums, a large university, and a location that makes it everybody's midpoint. Its food reflects that: built for crowds, groups and before-the-game timing.",
      "It also has one of the more diverse populations in North Texas, with substantial Vietnamese, Nigerian, Mexican and Korean communities that most visitors driving to a stadium never notice.",
    ],
    dishes: [
      ["Texas barbecue", "Brisket and sausage, in the Tarrant County tradition."],
      ["Tex-Mex", "Enchiladas, fajitas and queso, and a long-established Mexican-American community."],
      ["Vietnamese", "A substantial community, with pho and banh mi across the city's east side."],
      ["Nigerian and West African", "Jollof, egusi and suya. One of the larger communities in Texas."],
      ["Pre-game group food", "A genuine local speciality: places built to feed twelve people quickly."],
    ],
    areas: [
      ["East Arlington", "Vietnamese, Mexican and West African restaurants."],
      ["The entertainment district", "Built for volume, so choose on the food rather than the proximity."],
    ],
    searches: ["somewhere for a big group before a game", "brisket", "pho", "tex-mex with queso"],
    foods: ["bbq", "tacos", "pho", "mexican-food", "wings"],
  },
];
