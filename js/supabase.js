// Supabase client - HARDCODED for Chibee Lending - production ready
const SUPABASE_URL = 'https://dljztbyrwwlxazpxnxoa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7UQrDW6gwlETRXKFSuDnCQ_ylPFTSs-';

let supabaseClient = null;
function getSupabase(){
  if(supabaseClient) return supabaseClient;
  if(window.supabase){
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  throw new Error('Supabase SDK not loaded');
}

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
