
async function loadPayments(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const {data}=await supa.from('payments').select('*, loans(principal), payment_schedules(payment_number,due_date)').eq('user_id', sess.user.id).order('payment_date',{ascending:false}).limit(100);
  const tbody=document.getElementById('paymentsBody');
  if(!data||!data.length){ tbody.innerHTML='<tr><td colspan=6><div class="empty">No payments yet</div></td></tr>'; return; }
  tbody.innerHTML=data.map(p=>`<tr><td>${fmtDate(p.payment_date)}</td><td>${peso(p.amount_paid)}</td><td>${p.payment_method}</td><td>#${p.payment_schedules?.payment_number||''} due ${p.payment_schedules?.due_date||''}</td><td>${p.reference_number||''}</td><td>${p.loans?.principal? peso(p.loans.principal):''}</td></tr>`).join('');
}
async function loadDue(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const {data}=await supa.from('payment_schedules').select('*, loans(principal, borrowers(full_name,mobile_number))').eq('user_id', sess.user.id).neq('status','Paid').order('due_date');
  const today=todayStr();
  const todayList=data.filter(d=>d.due_date===today);
  const upcoming=data.filter(d=>{ const diff=(new Date(d.due_date)-new Date(today))/(1000*60*60*24); return diff>0 && diff<=7; });
  const overdue=data.filter(d=> new Date(d.due_date) < new Date(today) && d.status!=='Paid');
  const render=(list, elId)=>{
    const el=document.getElementById(elId);
    if(!list.length){ el.innerHTML='<div class="empty">None</div>'; return; }
    el.innerHTML=list.map(s=>`<div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
      <div><b>${s.loans?.borrowers?.full_name||'Borrower'}</b><div style="font-size:12px; color:var(--muted)">#${s.payment_number} Due ${s.due_date} • ${peso(s.remaining_amount)}</div><div style="font-size:12px">${s.loans?.borrowers?.mobile_number||''}</div></div>
      <div style="display:flex; gap:6px; flex-direction:column">
        <span class="badge ${s.status==='Overdue'?'danger':s.due_date===today?'warn':'info'}">${s.status}</span>
        <button class="btn sm primary" onclick="sendSMS('${s.id}')">SMS Reminder</button>
      </div>
    </div>`).join('');
  };
  render(todayList,'todayDue'); render(upcoming,'upcomingDue'); render(overdue,'overdueDue');
}
async function sendSMS(scheduleId){
  const supa=getSupabase();
  const {data:sched}=await supa.from('payment_schedules').select('*, loans(borrower_id, borrowers(full_name,mobile_number))').eq('id', scheduleId).single();
  const borrowerName=sched.loans?.borrowers?.full_name||'Borrower';
  const amount=peso(sched.remaining_amount);
  const date=sched.due_date;
  const phone=sched.loans?.borrowers?.mobile_number||'';
  const message=`Hello ${borrowerName}, this is a reminder that your payment of ${amount} is due on ${date}. Thank you.`;
  // save reminder
  const {data:{user}}=await supa.auth.getUser();
  await supa.from('sms_reminders').insert({user_id:user.id, borrower_id:sched.loans?.borrower_id, loan_id:sched.loan_id, schedule_id:scheduleId, phone_number:phone, message, status:'Pending Provider'});
  const box=document.getElementById('modalBox');
  box.innerHTML=`<h3>SMS Reminder</h3><div class="grid"><div><label class="label">To</label><input class="input" value="${phone}" readonly></div><div><label class="label">Message</label><textarea class="textarea" readonly>${message}</textarea></div><div style="background:#fef3c7; padding:10px; border-radius:10px; font-size:13px">SMS provider not configured. Copy this message and send manually via your phone. To integrate, connect Twilio/Semaphore in future.</div><div style="display:flex; gap:8px"><button class="btn primary" onclick="navigator.clipboard.writeText(\`${message}\`); toast('Copied')">Copy</button><button class="btn" onclick="closeModal()">Close</button></div></div>`;
  document.getElementById('modal').style.display='grid';
}
function closeModal(){ document.getElementById('modal').style.display='none'; }