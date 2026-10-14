import { createClient } from '@supabase/supabase-js'

// Supabase dashboard se copy kiye hue URL aur Key yahan daalo
const supabaseUrl = 'https://mijhmhmycfjtbcfmnqva.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pamhtaG15Y2ZqdGJjZm1ucXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDAxNjIsImV4cCI6MjEwNzQ3NjE2Mn0.jUIN0n-P-c87eEau2CSK9u7ce9710um9H_VqdGcf5Ro'

export const supabase = createClient(supabaseUrl, supabaseKey)