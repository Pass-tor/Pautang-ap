
async function loadReports(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const {data:payments}=await supa.from('payments').select('*').eq('user_id', sess.user.id).order('payment_date');
  const {data:loans}=await supa.from('loans').select('*').eq('user_id', sess.user.id);
  const totalInterest=loans.reduce((s,l)=>s+Number(l.interest_amount),0);
  document.getElementById('reportSummary').innerHTML=`<div class="grid grid-3">
    <div class="card">Total Interest Earned: <b>${peso(totalInterest)}</b></div>
    <div class="card">Total Loans: <b>${loans.length}</b></div>
    <div class="card">Completed: <b>${loans.filter(l=>l.status==='Completed').length}</b></div>
  </div>`;
  // daily collections last 7
  const daily={};
  payments.forEach(p=>{ daily[p.payment_date]=(daily[p.payment_date]||0)+Number(p.amount_paid); });
  const rows=Object.entries(daily).sort().slice(-14);
  document.getElementById('reportBody').innerHTML=rows.map(([d,a])=>`<tr><td>${d}</td><td>${peso(a)}</td></tr>`).join('') || '<tr><td colspan=2>No data</td></tr>';
}
function exportCSV(){
  const rows=document.querySelectorAll('#reportBody tr');
  let csv='Date,Amount\n';
  rows.forEach(r=>{ const tds=r.querySelectorAll('td'); if(tds.length>=2) csv+=`${tds[0].textContent},${tds[1].textContent}\n`; });
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='collections.csv'; a.click();
}
function printReport(){ window.print(); }
document.addEventListener('DOMContentLoaded', loadReports);