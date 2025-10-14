// Fix Master Session - Run this in browser console
// This will manually set the master session

console.log('🔧 Fixing master session...');

// Set master role in localStorage
localStorage.setItem('saphari_user_role', 'master');
localStorage.setItem('saphari_master_session', 'dev-session-' + Date.now());

console.log('✅ Master session set in localStorage');

// Test the master access function
if (window.supabase) {
  window.supabase.rpc('can_access_master_features').then(result => {
    console.log('Master access test:', result.data, 'Error:', result.error);
  });
} else {
  console.log('⚠️ Supabase not available in global scope');
}

console.log('🔄 Please refresh the page to apply changes');
