
function calculateLoan(principal, rate, durationMonths, freq, processingFee=0){
  principal=Number(principal); rate=Number(rate); processingFee=Number(processingFee||0);
  const interestAmount = +(principal * rate / 100).toFixed(2);
  const total = +(principal + interestAmount + processingFee).toFixed(2);
  let numPayments=0;
  if(freq==='Monthly') numPayments=durationMonths;
  else if(freq==='Twice a Month') numPayments=durationMonths*2;
  else if(freq==='Weekly') numPayments=durationMonths*4; // approx 4 weeks per month
  const paymentAmount = +(total/numPayments).toFixed(2);
  return {interestAmount, totalPayable:total, numPayments, paymentAmount};
}
function generateSchedule(startDate, numPayments, freq, paymentAmount, totalPayable){
  const schedules=[];
  let due = new Date(startDate);
  let remaining = totalPayable;
  for(let i=1;i<=numPayments;i++){
    let dueDate;
    if(i===1) dueDate=new Date(due);
    else {
      dueDate=new Date(due);
      if(freq==='Monthly') dueDate.setMonth(dueDate.getMonth()+1);
      else if(freq==='Twice a Month'){
        // 15 days apart
        dueDate.setDate(dueDate.getDate()+15);
      } else { // Weekly
        dueDate.setDate(dueDate.getDate()+7);
      }
      due=dueDate;
    }
    // adjust for last payment rounding
    let exp = i===numPayments ? +remaining.toFixed(2) : paymentAmount;
    remaining = +(remaining - exp).toFixed(2);
    if(remaining<0) remaining=0;
    schedules.push({
      payment_number:i,
      due_date: dueDate.toISOString().slice(0,10),
      expected_amount: exp,
      remaining_amount: exp,
      status: dueDate.toISOString().slice(0,10)===todayStr()?'Due Today':'Upcoming'
    });
  }
  return schedules;
}

let borrowersList=[];
async function loadLoans(){
  const sess=await requireAuth(); if(!sess) return;
  document.getElementById('userEmail').textContent=sess.user.email;
  const supa=getSupabase();
  const [bRes, lRes] = await Promise.all([
    supa.from('borrowers').select('id,full_name').eq('user_id', sess.user.id),
    supa.from('loans').select('*, borrowers(full_name)').eq('user_id', sess.user.id).order('created_at',{ascending:false})
  ]);
  borrowersList=bRes.data||[];
  renderLoans(lRes.data||[]);
  populateBorrowerSelect();
  // load default interest from profile
  const prof=await supa.from('profiles').select('default_interest_rate').eq('id', sess.user.id).single();
  if(prof.data && document.getElementById('interest_rate')) document.getElementById('interest_rate').value=prof.data.default_interest_rate||10;
}
function populateBorrowerSelect(){
  const sel=document.getElementById('borrower_id');
  if(!sel) return;
  sel.innerHTML='<option value="">Select borrower</option>'+borrowersList.map(b=>`<option value="${b.id}">${b.full_name}</option>`).join('');
}
function renderLoans(loans){
  const q=document.getElementById('search')?.value.toLowerCase()||'';
  const statusF=document.getElementById('statusFilter')?.value||'';
  let filtered=loans;
  if(q) filtered=filtered.filter(l=> (l.borrowers?.full_name||'').toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
  if(statusF) filtered=filtered.filter(l=>l.status===statusF);
  const tbody=document.getElementById('loansBody');
  if(!filtered.length){ tbody.innerHTML='<tr><td colspan=9><div class="empty"><div class="big">📄</div>No loans</div></td></tr>'; return; }
  tbody.innerHTML=filtered.map(l=>`<tr>
    <td>${l.id.slice(0,8)}</td>
    <td>${l.borrowers?.full_name||'-'}</td>
    <td>${peso(l.principal)}</td>
    <td>${peso(l.total_payable)}</td>
    <td>${peso(Number(l.total_payable)-Number(l.remaining_balance))}</td>
    <td>${peso(l.remaining_balance)}</td>
    <td><span class="badge ${l.status==='Active'?'success':l.status==='Completed'?'info':l.status==='Overdue'?'danger':'warn'}">${l.status}</span></td>
    <td>${l.start_date}</td>
    <td style="display:flex; gap:6px"><a class="btn sm" href="loan-view.html?id=${l.id}">View</a><button class="btn sm" onclick="openPaymentModal('${l.id}')">Pay</button></td>
  </tr>`).join('');
}
function openLoanModal(){
  const box=document.getElementById('modalBox');
  box.innerHTML=`<h3 style="margin:0 0 12px">Add Loan</h3>
  <form id="loanForm" class="grid">
    <div><label class="label">Borrower *</label><select id="borrower_id" class="select" required></select></div>
    <div class="grid grid-2">
      <div><label class="label">Principal (₱) *</label><input id="principal" class="input" type="number" step="0.01" min="0.01" required></div>
      <div><label class="label">Interest Rate % *</label><input id="interest_rate" class="input" type="number" step="0.01" min="0" max="100" required></div>
    </div>
    <div class="grid grid-2">
      <div><label class="label">Duration</label><select id="duration" class="select"><option>1 month</option><option>2 months</option><option>3 months</option><option>4 months</option><option>5 months</option><option>6 months</option><option>7 months</option><option>8 months</option><option>9 months</option><option>10 months</option><option>11 months</option><option>12 months</option></select></div>
      <div><label class="label">Frequency</label><select id="frequency" class="select"><option>Monthly</option><option>Twice a Month</option><option>Weekly</option></select></div>
    </div>
    <div class="grid grid-2">
      <div><label class="label">Start Date *</label><input id="start_date" class="input" type="date" required value="${todayStr()}"></div>
      <div><label class="label">Processing Fee (optional)</label><input id="fee" class="input" type="number" step="0.01" min="0" value="0"></div>
    </div>
    <div><label class="label">Notes</label><textarea id="notes" class="textarea"></textarea></div>
    <div id="summary" class="card" style="background:color-mix(in srgb, var(--card) 80%, var(--bg)); position:sticky; top:0; z-index:1"></div>
    <div class="sticky-actions" style="display:flex; gap:8px"><button class="btn primary" type="submit" style="flex:1">Save Loan</button><button type="button" class="btn" onclick="closeModal()" style="flex:1">Cancel</button></div>
  </form>`;
  document.getElementById('modal').style.display='grid';
  populateBorrowerSelect();
  const updateSummary=()=>{
    const p=Number(document.getElementById('principal').value||0);
    const r=Number(document.getElementById('interest_rate').value||0);
    const d=parseInt(document.getElementById('duration').value)||1;
    const f=document.getElementById('frequency').value;
    const fee=Number(document.getElementById('fee').value||0);
    const calc=calculateLoan(p,r,d,f,fee);
    document.getElementById('summary').innerHTML=`<div style="font-weight:700; margin-bottom:6px">Loan Summary</div>
      Interest Amount: ${peso(calc.interestAmount)}<br>
      Total Payable: ${peso(calc.totalPayable)}<br>
      Payments: ${calc.numPayments} x ${peso(calc.paymentAmount)}<br>
      Principal ₱${p} + Interest ${r}% = ₱${calc.interestAmount} => Total ₱${calc.totalPayable}`;
  };
  ['principal','interest_rate','duration','frequency','fee'].forEach(id=>{ document.getElementById(id).addEventListener('input', updateSummary); document.getElementById(id).addEventListener('change', updateSummary); });
  updateSummary();
  document.getElementById('loanForm').onsubmit=async (e)=>{
    e.preventDefault();
    const borrower_id=document.getElementById('borrower_id').value;
    const principal=Number(document.getElementById('principal').value);
    const interest_rate=Number(document.getElementById('interest_rate').value);
    const durationStr=document.getElementById('duration').value;
    const duration_months=parseInt(durationStr);
    const payment_frequency=document.getElementById('frequency').value;
    const start_date=document.getElementById('start_date').value;
    const processing_fee=Number(document.getElementById('fee').value||0);
    const notes=document.getElementById('notes').value;
    const calc=calculateLoan(principal, interest_rate, duration_months, payment_frequency, processing_fee);
    const supa=getSupabase();
    const {data:{user}}=await supa.auth.getUser();
    const {data:loan, error}=await supa.from('loans').insert({
      user_id:user.id, borrower_id, principal, interest_rate, interest_amount:calc.interestAmount, total_payable:calc.totalPayable,
      processing_fee, duration_months, start_date, payment_frequency, num_payments:calc.numPayments, payment_amount:calc.paymentAmount,
      remaining_balance:calc.totalPayable, status:'Active', notes
    }).select().single();
    if(error){ toast(error.message); return; }
    // generate schedules
    const schedules=generateSchedule(start_date, calc.numPayments, payment_frequency, calc.paymentAmount, calc.totalPayable).map(s=>({...s, user_id:user.id, loan_id:loan.id, amount_paid:0}));
    const {error:e2}=await supa.from('payment_schedules').insert(schedules);
    if(e2){ toast('Loan saved but schedule error: '+e2.message); }
    closeModal(); toast('Loan created'); loadLoans();
  };
}
function closeModal(){ document.getElementById('modal').style.display='none'; }

async function openPaymentModal(loanId){
  const supa=getSupabase();
  const {data:loan}=await supa.from('loans').select('*, borrowers(full_name,mobile_number)').eq('id', loanId).single();
  const {data:schedules}=await supa.from('payment_schedules').select('*').eq('loan_id', loanId).order('payment_number');
  const box=document.getElementById('modalBox');
  box.innerHTML=`<h3>Record Payment - ${loan.borrowers?.full_name}</h3>
  <div style="font-size:13px; color:var(--muted); margin-bottom:8px">Remaining: ${peso(loan.remaining_balance)} • Total: ${peso(loan.total_payable)}</div>
  <form id="payForm" class="grid">
    <div><label class="label">Schedule</label><select id="schedule_id" class="select" required>${schedules.map(s=>`<option value="${s.id}" ${s.status==='Paid'?'disabled':''}>#${s.payment_number} - Due ${s.due_date} - ${peso(s.remaining_amount)} ${s.status}</option>`).join('')}</select></div>
    <div class="grid grid-2"><div><label class="label">Amount Paid *</label><input id="amount_paid" class="input" type="number" step="0.01" required></div>
    <div><label class="label">Payment Date</label><input id="payment_date" class="input" type="date" required value="${todayStr()}"></div></div>
    <div class="grid grid-2"><div><label class="label">Method</label><select id="method" class="select"><option>Cash</option><option>GCash</option><option>Bank Transfer</option><option>Other</option></select></div>
    <div><label class="label">Reference</label><input id="ref" class="input"></div></div>
    <div><label class="label">Notes</label><input id="pay_notes" class="input"></div>
    <div style="display:flex; gap:8px"><button class="btn primary" type="submit">Save Payment</button><button type="button" class="btn" onclick="closeModal()">Cancel</button></div>
  </form>`;
  document.getElementById('modal').style.display='grid';
  document.getElementById('payForm').onsubmit=async (e)=>{
    e.preventDefault();
    const schedule_id=document.getElementById('schedule_id').value;
    const amount_paid=Number(document.getElementById('amount_paid').value);
    const payment_date=document.getElementById('payment_date').value;
    const payment_method=document.getElementById('method').value;
    const reference_number=document.getElementById('ref').value;
    const notes=document.getElementById('pay_notes').value;
    const sched=schedules.find(s=>s.id===schedule_id);
    if(amount_paid > Number(sched.remaining_amount) + 0.01){
      if(!confirm(`Amount ₱${amount_paid} exceeds remaining ₱${sched.remaining_amount} for this installment. Allow overpayment?`)) return;
    }
    const supa=getSupabase();
    const {data:{user}}=await supa.auth.getUser();
    const {error}=await supa.from('payments').insert({user_id:user.id, loan_id:loanId, schedule_id, amount_paid, payment_date, payment_method, reference_number, notes});
    if(error){ toast(error.message); return; }
    // update schedule
    const newPaid=Number(sched.amount_paid)+amount_paid;
    const newRemaining=Math.max(0, Number(sched.expected_amount)-newPaid);
    const newStatus = newRemaining<=0.01?'Paid': newPaid>0?'Partially Paid':sched.status;
    await supa.from('payment_schedules').update({amount_paid:newPaid, remaining_amount:newRemaining, status:newStatus}).eq('id', schedule_id);
    // update loan
    const newLoanRemaining=Math.max(0, Number(loan.remaining_balance)-amount_paid);
    const newLoanStatus=newLoanRemaining<=0.01?'Completed':loan.status;
    await supa.from('loans').update({remaining_balance:newLoanRemaining, status:newLoanStatus}).eq('id', loanId);
    closeModal(); toast('Payment recorded'); loadLoans();
  };
}
document.addEventListener('DOMContentLoaded', loadLoans);