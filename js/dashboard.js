
async function loadDashboard(){
  const session = await requireAuth(); if(!session) return;
  const supa = getSupabase();
  const userId = session.user.id;
  document.getElementById('userEmail').textContent = session.user.email;

  const [borrowersRes, loansRes, schedulesRes, paymentsRes] = await Promise.all([
    supa.from('borrowers').select('id').eq('user_id', userId),
    supa.from('loans').select('*').eq('user_id', userId),
    supa.from('payment_schedules').select('*').eq('user_id', userId),
    supa.from('payments').select('amount_paid,payment_date').eq('user_id', userId)
  ]);

  const borrowers = borrowersRes.data||[];
  const loans = loansRes.data||[];
  const schedules = schedulesRes.data||[];
  const payments = paymentsRes.data||[];

  const activeLoans = loans.filter(l=>l.status==='Active');
  const totalLent = loans.reduce((s,l)=>s+Number(l.principal),0);
  const totalCollected = payments.reduce((s,p)=>s+Number(p.amount_paid),0);
  const totalOutstanding = loans.reduce((s,l)=>s+Number(l.remaining_balance),0);
  const totalCapital = totalLent; // simple definition, can be extended in settings

  const today = todayStr();
  const todayDue = schedules.filter(s=>s.due_date===today && s.status!=='Paid');
  const overdue = schedules.filter(s=> new Date(s.due_date) < new Date(todayStr()) && s.status!=='Paid');

  // KPI render
  document.getElementById('kpi').innerHTML = `
    <div class="card kpi"><div class="icon" style="background:#dbeafe">💼</div><div><div style="font-size:12px;color:var(--muted)">Total Capital</div><div style="font-weight:800">${peso(totalCapital)}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#dcfce7">📄</div><div><div style="font-size:12px;color:var(--muted)">Active Loans</div><div style="font-weight:800">${activeLoans.length}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#fef3c7">💸</div><div><div style="font-size:12px;color:var(--muted)">Amount Lent</div><div style="font-weight:800">${peso(totalLent)}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#e0e7ff">💰</div><div><div style="font-size:12px;color:var(--muted)">Collected</div><div style="font-weight:800">${peso(totalCollected)}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#fee2e2">📉</div><div><div style="font-size:12px;color:var(--muted)">Outstanding</div><div style="font-weight:800">${peso(totalOutstanding)}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#ffedd5">⏰</div><div><div style="font-size:12px;color:var(--muted)">Today's Due</div><div style="font-weight:800">${todayDue.length} • ${peso(todayDue.reduce((s,x)=>s+Number(x.remaining_amount),0))}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#fecaca">⚠️</div><div><div style="font-size:12px;color:var(--muted)">Overdue</div><div style="font-weight:800">${overdue.length} • ${peso(overdue.reduce((s,x)=>s+Number(x.remaining_amount),0))}</div></div></div>
    <div class="card kpi"><div class="icon" style="background:#f0fdf4">👥</div><div><div style="font-size:12px;color:var(--muted)">Borrowers</div><div style="font-weight:800">${borrowers.length}</div></div></div>
  `;

  // Monthly collections chart (simple)
  const monthly = {};
  payments.forEach(p=>{
    const m = (p.payment_date||'').slice(0,7);
    if(!m) return;
    monthly[m]=(monthly[m]||0)+Number(p.amount_paid);
  });
  const months = Object.keys(monthly).sort().slice(-6);
  const max = Math.max(1, ...Object.values(monthly));
  document.getElementById('chart').innerHTML = months.map(m=>{
    const h = Math.max(8, Math.round((monthly[m]/max)*140));
    return `<div style="display:flex; flex-direction:column; align-items:center; gap:6px"><div class="bar" style="height:${h}px; width:100%"></div><div style="font-size:10px">${m.slice(5)}</div><div style="font-size:10px; font-weight:700">${peso(monthly[m]).replace('₱','')}</div></div>`;
  }).join('') || '<div class="empty">No collections yet</div>';

  // Active loans table
  document.getElementById('loansPreview').innerHTML = loans.slice(0,5).map(l=>`<tr><td>${l.id.slice(0,8)}</td><td>${peso(l.principal)}</td><td>${peso(l.remaining_balance)}</td><td><span class="badge ${l.status==='Active'?'success':l.status==='Overdue'?'danger':'info'}">${l.status}</span></td></tr>`).join('') || '<tr><td colspan=4>No loans</td></tr>';
}
document.addEventListener('DOMContentLoaded', loadDashboard);