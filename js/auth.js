
async function requireAuth(){
  const supa = getSupabase();
  const {data:{session}} = await supa.auth.getSession();
  if(!session){
    location.href='login.html';
    return null;
  }
  return session;
}
async function initAuthPage(){
  const supa = getSupabase();
  // session persistence listener
  supa.auth.onAuthStateChange((event, session)=>{
    if(event==='SIGNED_IN' && location.pathname.endsWith('login.html')){
      location.href='dashboard.html';
    }
  });
}
async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = e.submitter;
  btn.disabled=true; btn.textContent='Signing in...';
  try{
    const {error} = await getSupabase().auth.signInWithPassword({email,password});
    if(error) throw error;
    toast('Welcome back!');
    location.href='dashboard.html';
  }catch(err){ toast(err.message); } finally{ btn.disabled=false; btn.textContent='Login'; }
}
async function handleRegister(e){
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const lender = document.getElementById('lender_name').value.trim();
  const btn = e.submitter;
  btn.disabled=true; btn.textContent='Creating account...';
  try{
    const {data, error} = await getSupabase().auth.signUp({email,password});
    if(error) throw error;
    // profile will be auto-created via trigger, update name
    if(data.user){
      await getSupabase().from('profiles').upsert({id:data.user.id, lender_name:lender});
    }
    toast('Account created. Check email if verification required.');
    location.href='login.html';
  }catch(err){ toast(err.message);} finally{ btn.disabled=false; btn.textContent='Register';}
}
async function handleForgot(e){
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  try{
    const {error} = await getSupabase().auth.resetPasswordForEmail(email, {redirectTo: location.origin + '/login.html'});
    if(error) throw error;
    toast('Reset link sent to '+email);
  }catch(err){ toast(err.message); }
}
async function logout(){
  await getSupabase().auth.signOut();
  location.href='login.html';
}