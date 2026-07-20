import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://qbhvxvidajwxqqnghpmr.supabase.co"
const supabaseKey = "sb_publishable_y5al-8naFc3DxCezSwcL8Q_i2wnwVZw"

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)



export { supabase };