'use client';
import { useState } from 'react';
import { ContentSwap } from './ContentSwap';
import s from './BusinessPanel.module.css';

type Order = { id: string; location: string; issue: string; status: string; note: string };
const initialOrders: Order[] = [
  { id: 'BX-0918', location: '南苑 3 栋 · 502', issue: '卫生间水龙头漏水', status: '处理中', note: '已检查阀芯，准备更换密封件。' },
  { id: 'BX-0920', location: '南苑 3 栋 · 312', issue: '空调无法启动', status: '已接单', note: '' },
  { id: 'BX-0921', location: '南苑 3 栋 · 1F', issue: '公共区域排水堵塞', status: '待接单', note: '' },
];
export function MaintenanceWorkspace({ featureId, actionId }: { featureId: string; actionId: string }) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState('BX-0918');
  const [records, setRecords] = useState([{ id: 'BX-0916', issue: '书桌灯管更换', note: '更换灯管并完成通电测试。', time: '09.16 14:20' }]);
  const current = orders.find(order => order.id === selected) ?? orders[0];
  const changeStatus = (id: string, status: string, note?: string) => {
    setOrders(previous => previous.map(order => order.id === id ? { ...order, status, note: note ?? order.note } : order));
    setMessage(id + ' 已更新为“' + status + '”（本次演示）');
  };
  const selector = <label>选择工单<select value={selected} onChange={event => setSelected(event.target.value)}>{orders.map(order => <option key={order.id} value={order.id}>{order.id} · {order.issue}</option>)}</select></label>;
  const summary = <div className={s.order}><div><small>{current.id} · {current.location}</small><h3>{current.issue}</h3></div><span>{current.status}</span></div>;
  return <div className={s.workspace}>
    <section className={s.overview} aria-label="维修工作概况"><div><span>待接单</span><strong>{orders.filter(order => order.status === '待接单').length}</strong></div><div><span>处理中</span><strong>{orders.filter(order => order.status === '处理中').length}</strong></div><div><span>本次完成</span><strong>{orders.filter(order => order.status === '已完成').length}</strong></div></section>
    <ContentSwap identity={featureId + actionId}><section className={s.panel}>
      {featureId === 'repair' && actionId === 'action-1' && <><header><h2>待开始的维修</h2><p>选择已接单的任务，确认现场情况后开始处理。</p></header>{orders.filter(order => order.status === '已接单').map(order => <div className={s.jobCard} key={order.id}><div><small>{order.id} · {order.location}</small><h3>{order.issue}</h3></div><button onClick={() => changeStatus(order.id, '处理中')}>开始维修 →</button></div>)}{!orders.some(order => order.status === '已接单') && <p>当前没有待开始的维修任务。</p>}</>}
      {featureId === 'repair' && actionId === 'action-2' && <><header><h2>更新处理状态</h2><p>记录当前进展与下一步安排。</p></header>{summary}<form key={selected} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); changeStatus(selected, String(data.get('status')), String(data.get('note'))); }}>{selector}<div className={s.fields}><label>当前状态<select name="status" defaultValue={current.status}><option>待接单</option><option>已接单</option><option>处理中</option><option>等待配件</option></select></label><label>预计完成时间<input name="eta" type="datetime-local" /></label></div><label>处理进展<textarea name="note" required rows={4} defaultValue={current.note} placeholder="填写已排查的问题和处理安排" /></label><footer><span>保存后同步更新上方工作概况。</span><button>保存进展 →</button></footer></form></>}
      {featureId === 'repair' && actionId === 'action-3' && <><header><h2>完工确认</h2><p>填写维修结果并确认现场测试，完成后移交学生评价。</p></header>{summary}<form key={selected} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); changeStatus(selected, '已完成', String(data.get('result'))); }}>{selector}<label>维修结果<textarea name="result" required rows={4} placeholder="维修措施、替换零件及测试结果" /></label><div className={s.fields}><label>使用材料<input name="materials" placeholder="如：密封圈 1 个" /></label><label>实际工时（小时）<input type="number" min="0.1" step="0.1" required name="hours" /></label></div><label className={s.checkRow}><input type="checkbox" required />已完成现场测试，故障已排除</label><footer><span>仅在确认修复后提交。</span><button disabled={current.status === '已完成'}>{current.status === '已完成' ? '已完成' : '确认完工 →'}</button></footer></form></>}
      {featureId === 'orders' && <><header><h2>{actionId === 'action-1' ? '我的派发工单' : '待确认接单'}</h2><p>{actionId === 'action-1' ? '查看任务位置、故障及当前处理状态。' : '只显示尚未接收的派发任务。'}</p></header>{orders.filter(order => actionId === 'action-1' || order.status === '待接单').map(order => <div key={order.id} className={s.jobCard}><div><small>{order.id} · {order.location}</small><h3>{order.issue}</h3><p>{order.note || '等待现场检查'}</p></div>{actionId === 'action-2' ? <button onClick={() => changeStatus(order.id, '已接单')}>确认接单 →</button> : <span>{order.status}</span>}</div>)}{actionId === 'action-2' && !orders.some(order => order.status === '待接单') && <p>所有派发工单均已接收。</p>}</>}
      {featureId === 'records' && (actionId === 'action-1' ? <><header><h2>填写维修记录</h2><p>记录故障原因、维修方法及最终结果。</p></header><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setRecords(previous => [...previous.filter(record => record.id !== selected), { id: selected, issue: current.issue, note: String(data.get('record')), time: '本次演示' }]); setMessage(selected + ' 维修记录已保存，可切换到维修归档查看。'); }}>{selector}<label>维修记录<textarea required rows={6} name="record" placeholder="故障原因、维修步骤、材料和验证结果" /></label><footer><span>保存到当前演示会话。</span><button>保存记录 →</button></footer></form></> : <><header><h2>维修归档</h2><p>已保存的维修说明与处理记录。</p></header>{records.map(record => <article className={s.jobCard} key={record.id}><div><small>{record.id} · {record.time}</small><h3>{record.issue}</h3><p>{record.note}</p></div><span>已归档</span></article>)}</>)}
      {featureId === 'analytics' && <><header><h2>{actionId === 'action-1' ? '工作量统计' : actionId === 'action-2' ? '工单完成率' : '服务评价'}</h2></header>{actionId === 'action-1' ? <div className={s.barChart}>{[['第一周',12],['第二周',17],['第三周',14],['第四周',13]].map(([label, value]) => <div key={label}><span>{label}</span><meter min="0" max="20" value={Number(value)} /><strong>{value} 单</strong></div>)}</div> : actionId === 'action-2' ? <><div className={s.rate}><strong>94.6%</strong><span>本月已完成 53 / 56 单</span></div><div className={s.jobCard}><span>按时完成</span><strong>50 单</strong><span>超时完成</span><strong>3 单</strong></div></> : <><div className={s.rate}><strong>4.9 / 5</strong><span>来自 41 次服务评价</span></div><article className={s.jobCard}><div><h3>灯管更换 · 5 星</h3><p>响应及时，修好后还帮忙检查了开关。</p></div></article><article className={s.jobCard}><div><h3>排水疏通 · 5 星</h3><p>处理仔细，现场清理得很干净。</p></div></article></>}</>}
    </section></ContentSwap>
    <p className={s.feedback} role="status">{message}</p>
  </div>;
}
