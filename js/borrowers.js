
let allBorrowers=[];
async function loadBorrowers(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const {data, error}= await supa.from('borrowers').select('*').eq('user_id', sess.user.id).order('created_at',{ascending:false});
  if(error){ toast(error.message); return; }
  allBorrowers=data;
  renderBorrowers(data);
}
function renderBorrowers(list){
  const q=document.getElementById('search')?.value.toLowerCase()||'';
  const filtered=list.filter(b=> !q || b.full_name.toLowerCase().includes(q) || (b.mobile_number||'').includes(q));
  const tbody=document.getElementById('borrowersBody');
  if(!filtered.length){ tbody.innerHTML='<tr><td colspan=5><div class="empty"><div class="big">👥</div>No borrowers found</div></td></tr>'; return; }
  tbody.innerHTML=filtered.map(b=>`<tr>
    <td><b>${b.full_name}</b><div style="font-size:12px;color:var(--muted)">${b.mobile_number}</div></td>
    <td>${b.address||'-'}</td>
    <td>${b.email||'-'}</td>
    <td>${fmtDate(b.date_added)}</td>
    <td style="display:flex; gap:6px"><a class="btn sm" href="borrower-view.html?id=${b.id}">View</a><button class="btn sm" onclick="editBorrower('${b.id}')">Edit</button><button class="btn sm" onclick="deleteBorrower('${b.id}')">Delete</button></td>
  </tr>`).join('');
}
function openBorrowerModal(b=null){
  const box=document.getElementById('modalBox');
  box.innerHTML=`<h3 style="margin:0 0 12px">${b?'Edit':'Add'} Borrower</h3>
  <form id="bForm" class="grid">
    <div><label class="label">Full Name *</label><input class="input" id="full_name" required value="${b?.full_name||''}"></div>
    <div><label class="label">Mobile Number *</label><input class="input" id="mobile_number" required pattern="[0-9+ ]{7,15}" value="${b?.mobile_number||''}"></div>
    <div><label class="label">Address</label><input class="input" id="address" value="${b?.address||''}"></div>
    <div><label class="label">Email (optional)</label><input class="input" id="email" type="email" value="${b?.email||''}"></div>
    <div><label class="label">Notes</label><textarea class="textarea" id="notes">${b?.notes||''}</textarea></div>
    <div style="display:flex; gap:8px"><button class="btn primary" type="submit">Save</button><button type="button" class="btn" onclick="closeModal()">Cancel</button></div>
  </form>`;
  document.getElementById('modal').style.display='grid';
  document.getElementById('bForm').onsubmit=async (e)=>{
    e.preventDefault();
    const payload={
      full_name:document.getElementById('full_name').value.trim(),
      mobile_number:document.getElementById('mobile_number').value.trim(),
      address:document.getElementById('address').value.trim(),
      email:document.getElementById('email').value.trim()||null,
      notes:document.getElementById('notes').value.trim()||null,
    };
    const supa=getSupabase();
    const {data:{user}}=await supa.auth.getUser();
    if(b){
      const {error}=await supa.from('borrowers').update({...payload, updated_at:new Date().toISOString()}).eq('id', b.id).eq('user_id', user.id);
      if(error) return toast(error.message);
    }else{
      const {error}=await supa.from('borrowers').insert({...payload, user_id:user.id});
      if(error) return toast(error.message);
    }
    closeModal(); toast('Saved'); loadBorrowers();
  };
}
function closeModal(){ document.getElementById('modal').style.display='none'; }
async function editBorrower(id){ const b=allBorrowers.find(x=>x.id===id); openBorrowerModal(b); }
async function deleteBorrower(id){
  if(!confirm('Delete borrower? Loans will remain but borrower link will be kept for history. Proceed?')) return;
  const supa=getSupabase();
  const {error}=await supa.from('borrowers').delete().eq('id', id);
  if(error) toast(error.message); else { toast('Deleted'); loadBorrowers(); }
}
document.addEventListener('DOMContentLoaded', loadBorrowers);