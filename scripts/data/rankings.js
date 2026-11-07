/* The college rankings at /rankings/: which schools in a group have the most
 * places to eat within a 10-minute walk of campus.
 *
 * Each started as a TikTok countdown (social/batches/2026-11-0x, the
 * "*-walkable" videos) and is published here in full so the numbers have a
 * page behind them: something a student paper, a reader or a comment can
 * check, cite and link to. The counts are not written here. They are read at
 * build time from food-scene.json (`w`: places within half a mile of the
 * campus point), so a page always shows the same figures as the campus pages.
 *
 * Groups:
 *   s        URL slug, /rankings/<s>
 *   name     how the group is said in a sentence ("Big Ten", "Ivy League")
 *   noun     what the members are ("school", "campus", "university")
 *   scope    one line on who is in it, shown under the table
 *   members  [short name, campus slug]. Short names are the ones the videos
 *            used; each links to that campus's page.
 *
 * Conference membership is for the 2026-27 season. The state groups are
 * every university in that state with 20,000+ students (IPEDS size category
 * 5), not counting community colleges and college systems.
 */
module.exports = [
  {
    s: "big-ten", name: "Big Ten", noun: "school",
    scope: "All 18 Big Ten universities, 2026-27.",
    members: [
      ["Michigan", "university-of-michigan-ann-arbor"], ["Rutgers", "rutgers-university-new-brunswick"],
      ["Northwestern", "northwestern-university"], ["Penn State", "pennsylvania-state-university-main-campus"],
      ["Indiana", "indiana-university-bloomington"], ["Iowa", "university-of-iowa"],
      ["Illinois", "university-of-illinois-urbana-champaign"], ["Nebraska", "university-of-nebraska-lincoln"],
      ["USC", "university-of-southern-california"], ["Ohio State", "ohio-state-university-main-campus"],
      ["Wisconsin", "university-of-wisconsin-madison"], ["Michigan State", "michigan-state-university"],
      ["Washington", "university-of-washington-seattle-campus"], ["Purdue", "purdue-university-main-campus"],
      ["Oregon", "university-of-oregon"], ["Minnesota", "university-of-minnesota-twin-cities"],
      ["Maryland", "university-of-maryland-college-park"], ["UCLA", "university-of-california-los-angeles"],
    ],
  },
  {
    s: "sec", name: "SEC", noun: "school",
    scope: "All 16 Southeastern Conference universities, 2026-27.",
    members: [
      ["Vanderbilt", "vanderbilt-university"], ["Texas", "the-university-of-texas-at-austin"],
      ["Georgia", "university-of-georgia"], ["Missouri", "university-of-missouri-columbia"],
      ["Kentucky", "university-of-kentucky"], ["Oklahoma", "university-of-oklahoma-norman-campus"],
      ["Florida", "university-of-florida"], ["South Carolina", "university-of-south-carolina-columbia"],
      ["LSU", "louisiana-state-university-and-agricultural-and-mechanical-college"],
      ["Texas A&M", "texas-a-and-m-university-college-station"], ["Alabama", "the-university-of-alabama"],
      ["Auburn", "auburn-university"], ["Tennessee", "the-university-of-tennessee-knoxville"],
      ["Arkansas", "university-of-arkansas"], ["Ole Miss", "university-of-mississippi"],
      ["Mississippi State", "mississippi-state-university"],
    ],
  },
  {
    s: "acc", name: "ACC", noun: "school",
    scope: "All 18 Atlantic Coast Conference universities, 2026-27, including Notre Dame.",
    members: [
      ["Cal", "university-of-california-berkeley"], ["Pitt", "university-of-pittsburgh-pittsburgh-campus"],
      ["UNC", "university-of-north-carolina-at-chapel-hill"], ["NC State", "north-carolina-state-university-at-raleigh"],
      ["Virginia Tech", "virginia-polytechnic-institute-and-state-university"], ["SMU", "southern-methodist-university"],
      ["Virginia", "university-of-virginia-main-campus"], ["Florida State", "florida-state-university"],
      ["Syracuse", "syracuse-university"], ["Clemson", "clemson-university"],
      ["Georgia Tech", "georgia-institute-of-technology-main-campus"], ["Stanford", "stanford-university"],
      ["Louisville", "university-of-louisville"], ["Miami", "university-of-miami"], ["Duke", "duke-university"],
      ["Boston College", "boston-college"], ["Notre Dame", "university-of-notre-dame"],
      ["Wake Forest", "wake-forest-university"],
    ],
  },
  {
    s: "big-12", name: "Big 12", noun: "school",
    scope: "All 16 Big 12 universities, 2026-27.",
    members: [
      ["Cincinnati", "university-of-cincinnati-main-campus"], ["Arizona", "university-of-arizona"],
      ["West Virginia", "west-virginia-university"], ["Arizona State", "arizona-state-university-campus-immersion"],
      ["Colorado", "university-of-colorado-boulder"], ["Kansas State", "kansas-state-university"],
      ["Baylor", "baylor-university"], ["Iowa State", "iowa-state-university"], ["Texas Tech", "texas-tech-university"],
      ["TCU", "texas-christian-university"], ["UCF", "university-of-central-florida"], ["BYU", "brigham-young-university"],
      ["Oklahoma State", "oklahoma-state-university-main-campus"], ["Houston", "university-of-houston"],
      ["Utah", "university-of-utah"], ["Kansas", "university-of-kansas"],
    ],
  },
  {
    s: "ivy-league", name: "Ivy League", noun: "school",
    scope: "All eight Ivy League universities.",
    members: [
      ["Yale", "yale-university"], ["Columbia", "columbia-university-in-the-city-of-new-york"],
      ["Harvard", "harvard-university"], ["Brown", "brown-university"], ["Penn", "university-of-pennsylvania"],
      ["Princeton", "princeton-university"], ["Cornell", "cornell-university"], ["Dartmouth", "dartmouth-college"],
    ],
  },
  {
    s: "university-of-california", name: "UC", noun: "campus", group: "University of California",
    scope: "All nine undergraduate campuses of the University of California.",
    members: [
      ["UC Berkeley", "university-of-california-berkeley"], ["UC Davis", "university-of-california-davis"],
      ["UC Irvine", "university-of-california-irvine"], ["UC San Diego", "university-of-california-san-diego"],
      ["UCLA", "university-of-california-los-angeles"], ["UC Riverside", "university-of-california-riverside"],
      ["UC Santa Barbara", "university-of-california-santa-barbara"], ["UC Santa Cruz", "university-of-california-santa-cruz"],
      ["UC Merced", "university-of-california-merced"],
    ],
  },
  {
    s: "texas", name: "Texas", noun: "university", big: true,
    scope: "Every university in Texas with 20,000 or more students.",
    members: [
      ["UT Austin", "the-university-of-texas-at-austin"], ["Texas State", "texas-state-university"],
      ["North Texas", "university-of-north-texas"], ["Baylor", "baylor-university"], ["Texas Tech", "texas-tech-university"],
      ["UTEP", "the-university-of-texas-at-el-paso"], ["UTRGV", "the-university-of-texas-rio-grande-valley"],
      ["Texas A&M", "texas-a-and-m-university-college-station"], ["UT Arlington", "the-university-of-texas-at-arlington"],
      ["Sam Houston State", "sam-houston-state-university"], ["Houston", "university-of-houston"],
      ["UTSA", "the-university-of-texas-at-san-antonio"], ["UT Dallas", "the-university-of-texas-at-dallas"],
    ],
  },
  {
    s: "florida", name: "Florida", noun: "university", big: true,
    scope: "Every university in Florida with 20,000 or more students.",
    members: [
      ["Florida State", "florida-state-university"], ["Florida", "university-of-florida"],
      ["FIU", "florida-international-university"], ["UCF", "university-of-central-florida"],
      ["USF", "university-of-south-florida"], ["Florida Atlantic", "florida-atlantic-university"],
      ["Nova Southeastern", "nova-southeastern-university"],
    ],
  },
  {
    s: "pennsylvania", name: "Pennsylvania", noun: "university", big: true,
    scope: "Every university in Pennsylvania with 20,000 or more students.",
    members: [
      ["Penn State", "pennsylvania-state-university-main-campus"], ["Drexel", "drexel-university"],
      ["Pitt", "university-of-pittsburgh-pittsburgh-campus"], ["Penn", "university-of-pennsylvania"],
      ["Temple", "temple-university"],
    ],
  },
];
