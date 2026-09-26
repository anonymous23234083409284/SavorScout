/* Supabase is loaded on demand rather than imported up front.

   supabase-js is roughly a quarter of the app's JavaScript, and most visitors
   (anyone reading a city, campus or food page) never touch auth before they
   leave. Importing it statically put all of it in the one script every page
   parses before it can respond to a tap. As a dynamic import it downloads in
   parallel and is created once; every caller awaits the same client. */
const supabaseUrl = "https://qbhvxvidajwxqqnghpmr.supabase.co"
const supabaseKey = "sb_publishable_y5al-8naFc3DxCezSwcL8Q_i2wnwVZw"

let client = null;

export function getSupabase() {
  if (!client) {
    client = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(supabaseUrl, supabaseKey))
      .catch((err) => { client = null; throw err; });
  }
  return client;
}
