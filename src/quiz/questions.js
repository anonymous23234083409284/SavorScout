/* ===========================================================================
   THE 7-DAY TASTE QUIZ — questions

   Six dimensions, one per day, five questions each. Day 7 is the reveal.

   Every question is written to the same three rules, because a quiz that fails
   them produces a personality nobody believes:

   1. NEVER ASK THE DIMENSION DIRECTLY. "How spicy do you like food?" measures
      how spicy someone WANTS to seem. Asking what they'd do at a specific
      table measures what they'd actually order. Every question is a scene.

   2. BOTH ANSWERS HAVE TO BE LIKEABLE. If one option reads as the boring or
      cowardly choice, people pick the flattering one and the score is noise.
      "I want the one I'll definitely enjoy" is a real position, not a failure
      of nerve, and it is written that way.

   3. THE SCENE HAS TO BE UNIVERSAL. A question about a specific chain or a
      regional dish is unanswerable for half the people who see it. Scenes are
      built from things that exist everywhere: a menu, a friend's suggestion,
      a queue, a late train home.

   `weight` marks the questions that discriminate hardest — usually the ones
   with a real cost attached. A question where the adventurous answer risks
   actual disappointment separates people far better than one where it costs
   nothing, so those count double.
   =========================================================================== */

export const DIMENSIONS = {
  heat:      { key: "heat",      day: 1, label: "Heat",      emoji: "🌶️", high: "Heat seeker",  low: "Keeps it mild" },
  sweet:     { key: "sweet",     day: 2, label: "Sweet",     emoji: "🍰", high: "Sweet tooth",  low: "Savoury to the end" },
  value:     { key: "value",     day: 3, label: "Value",     emoji: "💸", high: "Hunts value",  low: "Pays for the room" },
  adventure: { key: "adventure", day: 4, label: "Adventure", emoji: "🧭", high: "Orders blind", low: "Orders the sure thing" },
  lateNight: { key: "lateNight", day: 5, label: "Late night",emoji: "🌙", high: "Night owl",    low: "Early table" },
  discovery: { key: "discovery", day: 6, label: "Discovery", emoji: "🔍", high: "Finds the gem",low: "Trusts the crowd" },
};

export const DAY_ORDER = ["heat", "sweet", "value", "adventure", "lateNight", "discovery"];
export const TOTAL_DAYS = 7;

/* Each question: `a` scores HIGH on the dimension, `b` scores LOW.
   Sides are shuffled at render time so the high answer isn't always first —
   otherwise people learn the pattern by day two and stop reading. */
export const QUESTIONS = {
  heat: [
    {
      id: "heat_1",
      scene: "The table orders wings for everyone.",
      q: "The waiter asks how hot you want them.",
      a: { text: "Hottest thing on the board. That's the whole point.", emoji: "🔥" },
      b: { text: "Medium. I want to taste the chicken, not just the burn.", emoji: "🍗" },
      weight: 1,
    },
    {
      id: "heat_2",
      scene: "There's a bottle of chilli oil on the table.",
      q: "The food arrives already seasoned.",
      a: { text: "It's going on anyway. Everything's better with it.", emoji: "🌶️" },
      b: { text: "I'll taste it first — they seasoned it for a reason.", emoji: "🥄" },
      weight: 1,
    },
    {
      id: "heat_3",
      scene: "A dish on the menu has a little chilli symbol next to it.",
      q: "It's the thing you were going to order anyway.",
      a: { text: "Good. That's a recommendation, not a warning.", emoji: "😈" },
      b: { text: "I'll ask how hot it actually is before I commit.", emoji: "🤔" },
      weight: 2,
    },
    {
      id: "heat_4",
      scene: "You're eating something genuinely too spicy.",
      q: "Halfway through, your eyes are watering.",
      a: { text: "Finishing it. The pain is part of the meal.", emoji: "😤" },
      b: { text: "Slowing down. This stopped being fun a while ago.", emoji: "🥛" },
      weight: 2,
    },
    {
      id: "heat_5",
      scene: "Someone hands you a hot sauce you've never heard of.",
      q: "They're grinning about it.",
      a: { text: "Straight on the next bite, no test drop.", emoji: "🧪" },
      b: { text: "A tiny dab on the edge of the plate first.", emoji: "👀" },
      weight: 1,
    },
  ],

  sweet: [
    {
      id: "sweet_1",
      scene: "You're full. The dessert menu appears anyway.",
      q: "Everyone looks at each other.",
      a: { text: "I'll find room. I always find room.", emoji: "🍮" },
      b: { text: "Just the bill. I'd rather have had more of the main.", emoji: "🧾" },
      weight: 2,
    },
    {
      id: "sweet_2",
      scene: "Brunch. One plate, one choice.",
      q: "Same price, same size.",
      a: { text: "Pancakes, syrup, the whole thing.", emoji: "🥞" },
      b: { text: "Eggs, something salty, hot sauce.", emoji: "🍳" },
      weight: 1,
    },
    {
      id: "sweet_3",
      scene: "The sauce on your main is a bit sweet.",
      q: "Glaze, honey, something fruity.",
      a: { text: "Perfect. Sweet and savoury together is the best part.", emoji: "🍯" },
      b: { text: "Slightly too much. I'd rather it leaned salty.", emoji: "🧂" },
      weight: 1,
    },
    {
      id: "sweet_4",
      scene: "It's 3pm and you want something.",
      q: "Not a meal. Just something.",
      a: { text: "Something sweet with a coffee.", emoji: "🍪" },
      b: { text: "Crisps, nuts, something salty.", emoji: "🥨" },
      weight: 1,
    },
    {
      id: "sweet_5",
      scene: "A place is famous for exactly one thing: its dessert.",
      q: "The savoury food is fine. Not special.",
      a: { text: "Worth the trip on its own. I'd go just for that.", emoji: "🎂" },
      b: { text: "Then I'd rather eat somewhere the food is the point.", emoji: "🍽️" },
      weight: 2,
    },
  ],

  value: [
    {
      id: "value_1",
      scene: "Two places, five minutes apart.",
      q: "Same food, honestly. One's half the price.",
      a: { text: "The cheap one. It's the same meal.", emoji: "💸" },
      b: { text: "The nicer one. Sitting somewhere good is part of it.", emoji: "🕯️" },
      weight: 2,
    },
    {
      id: "value_2",
      scene: "Plastic chairs, paper plates, a queue out the door.",
      q: "The food smells incredible.",
      a: { text: "This is exactly where I want to eat.", emoji: "🪑" },
      b: { text: "I'd rather sit down properly for the same money.", emoji: "🍷" },
      weight: 1,
    },
    {
      id: "value_3",
      scene: "The bill comes and it's higher than you expected.",
      q: "The meal was genuinely very good.",
      a: { text: "Still annoyed. It wasn't worth that.", emoji: "😐" },
      b: { text: "Fine by me. Good food costs what it costs.", emoji: "🤷" },
      weight: 2,
    },
    {
      id: "value_4",
      scene: "Someone suggests a tasting menu for a birthday.",
      q: "It's a lot of money for one dinner.",
      a: { text: "I'd rather eat well three times for that.", emoji: "🧮" },
      b: { text: "Worth it. Some meals are supposed to be an event.", emoji: "✨" },
      weight: 1,
    },
    {
      id: "value_5",
      scene: "A takeaway counter with no seating and a handwritten menu.",
      q: "You've got nowhere to be.",
      a: { text: "Perfect. The best food usually looks like this.", emoji: "📝" },
      b: { text: "I'd like somewhere to actually sit and eat it.", emoji: "🪟" },
      weight: 1,
    },
  ],

  adventure: [
    {
      id: "adventure_1",
      scene: "There's one thing on the menu you can't identify.",
      q: "No description, no picture.",
      a: { text: "Ordering it. That's the interesting one.", emoji: "🎲" },
      b: { text: "Asking what it is first — then probably not.", emoji: "💬" },
      weight: 2,
    },
    {
      id: "adventure_2",
      scene: "You already know one dish here is excellent.",
      q: "You've had it before and loved it.",
      a: { text: "Trying something new anyway.", emoji: "🆕" },
      b: { text: "Getting the one I know is great. That's why I came.", emoji: "⭐" },
      weight: 2,
    },
    {
      id: "adventure_3",
      scene: "A cuisine you've genuinely never eaten opens nearby.",
      q: "You don't recognise a single dish.",
      a: { text: "Booking it this week.", emoji: "🧭" },
      b: { text: "I'll wait until someone I trust says it's good.", emoji: "⏳" },
      weight: 1,
    },
    {
      id: "adventure_4",
      scene: "The waiter offers to just bring you what the kitchen likes.",
      q: "You don't get to choose.",
      a: { text: "Yes. Let them cook.", emoji: "👨‍🍳" },
      b: { text: "I'd rather pick. I know what I feel like.", emoji: "📖" },
      weight: 1,
    },
    {
      id: "adventure_5",
      scene: "A dish is famous for a texture people find strange.",
      q: "Everyone warns you about it, not the taste.",
      a: { text: "Now I want it more.", emoji: "🐙" },
      b: { text: "Texture matters to me. I'll pass.", emoji: "🙅" },
      weight: 1,
    },
  ],

  lateNight: [
    {
      id: "late_1",
      scene: "It's 11pm and you haven't eaten properly.",
      q: "Plenty is still open.",
      a: { text: "Going out. Late food is the best food.", emoji: "🌙" },
      b: { text: "Something small at home. It's late.", emoji: "🛋️" },
      weight: 2,
    },
    {
      id: "late_2",
      scene: "A place you like does breakfast all day.",
      q: "It's 9pm.",
      a: { text: "Breakfast for dinner, obviously.", emoji: "🍳" },
      b: { text: "Breakfast food is for the morning.", emoji: "🌅" },
      weight: 1,
    },
    {
      id: "late_3",
      scene: "The group is deciding what time to eat.",
      q: "Nobody has anywhere to be tomorrow.",
      a: { text: "Later. Places get better when they get busy.", emoji: "🕙" },
      b: { text: "Earlier. I don't like eating heavy late.", emoji: "🕕" },
      weight: 2,
    },
    {
      id: "late_4",
      scene: "There's a 24-hour place with a serious reputation.",
      q: "It's 1am and you're passing it.",
      a: { text: "Going in. This is what it's for.", emoji: "🌃" },
      b: { text: "Noting it for a normal hour.", emoji: "📌" },
      weight: 1,
    },
    {
      id: "late_5",
      scene: "Last order is in ten minutes.",
      q: "You could just about make it.",
      a: { text: "Running. Worth it.", emoji: "🏃" },
      b: { text: "Not eating rushed. Tomorrow.", emoji: "🚶" },
      weight: 1,
    },
  ],

  discovery: [
    {
      id: "discovery_1",
      scene: "Two places, both good.",
      q: "One has 4.6 from 3,000 reviews. One has 4.8 from 30.",
      a: { text: "The one with 30. That's a place people haven't ruined yet.", emoji: "💎" },
      b: { text: "The one with 3,000. That many people aren't wrong.", emoji: "📊" },
      weight: 2,
    },
    {
      id: "discovery_2",
      scene: "A place has almost no online presence.",
      q: "No website, three photos, a phone number.",
      a: { text: "Promising. The good ones are often like that.", emoji: "📞" },
      b: { text: "Risky. I'd want to see what I'm walking into.", emoji: "🔎" },
      weight: 2,
    },
    {
      id: "discovery_3",
      scene: "Someone tells you about a place you've never heard of.",
      q: "It's a bit out of the way.",
      a: { text: "Going this week. That's how you find the good ones.", emoji: "🗺️" },
      b: { text: "Maybe. I'd check a few reviews first.", emoji: "⭐" },
      weight: 1,
    },
    {
      id: "discovery_4",
      scene: "A restaurant near you is genuinely famous.",
      q: "Everybody's been. It's good.",
      a: { text: "Which is exactly why I'd rather go elsewhere.", emoji: "🚪" },
      b: { text: "It's famous for a reason. I'd happily go.", emoji: "🏆" },
      weight: 1,
    },
    {
      id: "discovery_5",
      scene: "You're in a new city with one night.",
      q: "One meal, one shot.",
      a: { text: "Wandering until something looks right.", emoji: "🚶‍♀️" },
      b: { text: "Eating somewhere I've researched and know is good.", emoji: "📱" },
      weight: 2,
    },
  ],
};

/* Scoring. Each dimension lands on 0-100.

   The high answer earns its weight, the low answer earns nothing, and the
   result is expressed as a percentage of what was actually available — so
   someone who has only finished two days still gets an honest reading of
   those two days rather than a score dragged toward zero by the days they
   have not seen yet. That matters because most people never reach day 7. */
export function scoreDimension(answers, dimensionKey) {
  const qs = QUESTIONS[dimensionKey] || [];
  let earned = 0, available = 0;
  qs.forEach((q) => {
    const a = answers[q.id];
    if (a !== "a" && a !== "b") return;
    available += q.weight;
    if (a === "a") earned += q.weight;
  });
  if (!available) return null;
  return Math.round((earned / available) * 100);
}

export function scoreAll(answers) {
  const out = {};
  DAY_ORDER.forEach((k) => {
    const v = scoreDimension(answers, k);
    if (v !== null) out[k] = v;
  });
  return out;
}

export function answeredCount(answers, dimensionKey) {
  return (QUESTIONS[dimensionKey] || []).filter((q) => answers[q.id]).length;
}
