'use client';
import { useState } from 'react';
import { ContentSwap } from './ContentSwap';
import s from './BusinessPanel.module.css';
export function RepairWorkspace({ actionId }: { actionId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewed, setReviewed] = useState(false);
  return <div className={s.workspace}>
    <section className={s.overview} aria-label="报修概况"><div><span>进行中</span><strong>1</strong></div><div><span>待评价</span><strong>{reviewed ? 0 : 1}</strong></div><div><span>本学期报修</span><strong>{submitted ? 4 : 3}</strong></div></section>
    <ContentSwap identity={actionId}>
      {actionId === 'action-1' ? <section className={s.panel}><header><h2>提交报修</h2><p>填写故障位置和具体情况，便于维修人员提前准备。</p></header><form onSubmit={event => { event.preventDefault(); setSubmitted(true); }}><div className={s.fields}><label>报修位置<input required name="location" defaultValue="南苑 3 栋 · 502" /></label><label>故障类型<select name="category"><option>水电设施</option><option>家具门窗</option><option>空调设备</option><option>其他设施</option></select></label></div><label>故障描述<textarea required name="description" placeholder="请描述故障现象、发生时间及影响范围" rows={5} /></label><label>联系电话<input required name="phone" type="tel" placeholder="填写便于联系的手机号码" /></label><footer><span role="status">{submitted ? '演示报修已提交，可继续补充新的报修。' : '当前为演示模式，提交不会发送给维修人员。'}</span><button type="submit">提交报修 →</button></footer></form></section>
      : actionId === 'action-2' ? <section className={s.panel}><header><h2>处理进度</h2><p>查看正在处理的工单及最近更新。</p></header><div className={s.order}><div><small>BX-0918 · 南苑 3 栋 502</small><h3>卫生间水龙头漏水</h3></div><span>处理中</span></div><ol className={s.timeline}><li><strong>报修已提交</strong><span>09.18 10:24 · 故障信息已登记</span></li><li><strong>宿管审核通过</strong><span>09.18 10:40 · 已安排维修人员</span></li><li><strong>维修人员已接单</strong><span>09.18 11:05 · 陈师傅正在处理</span></li><li data-pending="true"><strong>维修完成</strong><span>完成后可在“服务评价”中反馈</span></li></ol></section>
      : <section className={s.panel}><header><h2>服务评价</h2><p>这里仅显示已完成、可评价的维修工单。</p></header><div className={s.order}><div><small>BX-0912 · 09.13 14:20 完成</small><h3>书桌灯管不亮</h3></div><span>{reviewed ? '已评价' : '待评价'}</span></div><form onSubmit={event => { event.preventDefault(); setReviewed(true); }}><fieldset disabled={reviewed}><legend>服务评分</legend><div className={s.rating}>{[1,2,3,4,5].map(value => <button key={value} type="button" aria-label={value + '星'} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? '★' : '☆'}</button>)}</div><label>评价内容<textarea name="review" rows={4} placeholder="说说维修效果、响应速度或服务体验（选填）" /></label></fieldset><footer><span role="status">{reviewed ? '感谢反馈，评价已保存在本次演示中。' : '你的反馈有助于改善公寓维修服务。'}</span><button type="submit" disabled={reviewed}>{reviewed ? '已提交评价' : '提交评价 →'}</button></footer></form></section>}
    </ContentSwap>
  </div>;
}
