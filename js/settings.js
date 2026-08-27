
async function loadSettings(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const {data}=await supa.from('profiles').select('*').eq('id', sess.user.id).single();
  if(!data) return;
  ['lender_name','business_name','mobile_number','address','default_interest_rate'].forEach(k=>{
    const el=document.getElementById(k); if(el) el.value=data[k]||'';
  });
  document.getElementById('currency').value=data.currency||'PHP';
  // load supabase config inputs
  document.getElementById('cfgUrl').value=localStorage.getItem('SUPABASE_URL')||'';
  document.getElementById('cfgKey').value=localStorage.getItem('SUPABASE_ANON_KEY')||'';
}
async function saveSettings(e){
  e.preventDefault();
  const supa=getSupabase();
  const payload={
    lender_name:document.getElementById('lender_name').value.trim(),
    business_name:document.getElementById('business_name').value.trim(),
    mobile_number:document.getElementById('mobile_number').value.trim(),
    address:document.getElementById('address').value.trim(),
    default_interest_rate:Number(document.getElementById('default_interest_rate').value||10),
    currency:document.getElementById('currency').value,
    updated_at:new Date().toISOString()
  };
  const {data:{user}}=await supa.auth.getUser();
  const {error}=await supa.from('profiles').update(payload).eq('id', user.id);
  if(error) toast(error.message); else toast('Settings saved');
}
function saveSupabaseConfig(){
  const url=document.getElementById('cfgUrl').value.trim();
  const key=document.getElementById('cfgKey').value.trim();
  localStorage.setItem('SUPABASE_URL', url);
  localStorage.setItem('SUPABASE_ANON_KEY', key);
  toast('Config saved. Reloading...'); setTimeout(()=>location.reload(),700);
}
document.addEventListener('DOMContentLoaded', loadSettings);