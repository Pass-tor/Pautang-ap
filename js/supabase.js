
// Supabase client - use public anon key only
// Replace with your project values in supabase.js
const SUPABASE_URL = localStorage.getItem('SUPABASE_URL') || 'https://dljztbyrwwlxazpxnxoa.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = localStorage.getItem('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanp0Ynlyd3dseGF6cHhueG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDcxMzYsImV4cCI6MjEwMzQyMzEzNn0.YBEVngiC0FJusCJldkUI7qmeThvYkwW00Ch3sOgov2U';

let supabaseClient = null;
function getSupabase(){
  if(supabaseClient) return supabaseClient;
  if(window.supabase){
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  throw new Error('Supabase SDK not loaded');
}

// helpers
const peso = (n) => {
  const num = Number(n||0);
  return '₱' + num.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
};
const uid = () => getSupabase().auth.getUser().then(r=>r.data?.user?.id);
const toast = (msg, ms=2800) => {
  const el = document.getElementById('toast');
  if(!el) return alert(msg);
  el.textContent = msg; el.style.display='block';
  setTimeout(()=> el.style.display='none', ms);
};
const fmtDate = (d) => {
  if(!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', {year:'numeric', month:'short', day:'numeric'});
};
const todayStr = () => new Date().toISOString().slice(0,10);