'use client';
import { useState } from 'react';
import type { RoleFeature } from '@/data/role-features';
import type { RoleId } from '@/data/accounts';
import { getModuleContent } from '@/data/module-content';
import { ContentSwap } from './ContentSwap';
import s from './BusinessPanel.module.css';

type Field = { label: string; type?: string; options?: string[] };
const forms: Record<string, Field[]> = {
  '修改个人信息': [{label:'姓名'},{label:'联系电话',type:'tel'},{label:'电子邮箱',type:'email'}],
  '修改登录密码': [{label:'当前密码',type:'password'},{label:'新密码',type:'password'},{label:'确认新密码',type:'password'}],
  '入住申请': [{label:'期望入住日期',type:'date'},{label:'公寓区域',options:['南苑','北苑','西苑']},{label:'入住备注',type:'textarea'}],
  '调宿申请': [{label:'当前房间'},{label:'意向公寓区域',options:['南苑','北苑','西苑']},{label:'调宿原因',type:'textarea'}],
  '退宿申请': [{label:'退宿日期',type:'date'},{label:'退宿原因',type:'textarea'},{label:'联系电话',type:'tel'}],
  '入住登记与分配': [{label:'学生学号'},{label:'分配房间'},{label:'分配床位',options:['01','02','03','04']},{label:'入住日期',type:'date'}],
  '退宿登记': [{label:'学生学号'},{label:'退宿日期',type:'date'},{label:'物品交接',options:['已核对','存在缺损']},{label:'交接备注',type:'textarea'}],
  '状态更新': [{label:'床位编号'},{label:'更新状态',options:['空闲','已入住','维修停用']},{label:'变更原因',type:'textarea'}],
  '分床规则': [{label:'适用公寓',options:['全校公寓','南苑','北苑']},{label:'分配方式',options:['按学院集中','按班级集中','按空闲床位顺序']},{label:'每间人数',options:['4 人','6 人']},{label:'例外说明',type:'textarea'}],
  '住宿流程': [{label:'业务类型',options:['入住','调宿','退宿']},{label:'审核环节',options:['宿管审核','宿管及管理员审核']},{label:'办理时限（天）',type:'number'}],
  '缴费流程': [{label:'账单类型',options:['水电费','住宿费']},{label:'缴费期限（天）',type:'number'},{label:'提醒方式',options:['站内提醒','站内及短信提醒']}],
  '角色权限': [{label:'角色',options:['学生','宿管人员','维修人员','系统管理员']},{label:'权限范围',options:['本人数据','负责楼栋','获派工单','全局数据']},{label:'授权说明',type:'textarea'}],
  '备份策略': [{label:'执行频率',options:['每日','每周']},{label:'执行时间',type:'time'},{label:'保留天数',type:'number'}],
};
type Table = { columns: string[]; rows: string[][] };
const lists: Record<string, Table> = {
 '学生信息':{columns:['学号','姓名','所在房间','入住状态'],rows:[['202602341','林晓屿','南苑 3 栋 502','已入住'],['202602114','刘知行','南苑 3 栋 406','已入住']]},
 '房间信息':{columns:['房间','房型','入住人数','设施情况'],rows:[['南苑 3 栋 502','四人间','4 / 4','正常'],['南苑 3 栋 406','四人间','3 / 4','正常'],['南苑 3 栋 312','四人间','2 / 4','维修中']]},
 '床位信息':{columns:['床位编号','入住学生','房间','状态'],rows:[['03-0502-01','林晓屿','502','已入住'],['03-0406-03','—','406','空闲']]},
 '调宿审核':{columns:['申请编号','学生','调宿意向','状态'],rows:[['TS-0082','刘知行','南苑 406 → 502','待审核'],['TS-0079','陈嘉禾','南苑 → 北苑','资料待补充']]},
 '异常校验':{columns:['床位','异常类型','核查结果','处理建议'],rows:[['03-0312-04','维修停用','设施尚未修复','保持停用'],['03-0406-03','空床核验','无人入住','可分配']]},
 '待初审工单':{columns:['工单','位置','故障说明','紧急程度'],rows:[['BX-0921','公共洗衣区','排水不畅','普通'],['BX-0922','318 室','插座冒烟','紧急']]},
 '上报维修':{columns:['工单','位置','初审结果','上报状态'],rows:[['BX-0920','312 室','确需更换空调配件','待上报']]},
 '驳回报修':{columns:['工单','原因','学生','状态'],rows:[['BX-0909','重复提交','周子涵','已驳回']]},
 '欠费名单':{columns:['学生','房间','欠费金额','逾期天数'],rows:[['王雨宁','518','¥186.40','3 天'],['陈嘉禾','423','¥152.80','未逾期']]},
 '催缴记录':{columns:['提醒编号','学生','发送时间','处理结果'],rows:[['TX-0920','王雨宁','09.20 09:00','已送达'],['TX-0919','刘知行','09.19 09:00','已缴清']]},
 '待派工':{columns:['工单','位置','故障类型','状态'],rows:[['BX-1028','北苑 608','空调','待派工'],['BX-1027','南苑 1F','排水','待派工']]},
 '进度监控':{columns:['工单','维修人员','处理耗时','进度'],rows:[['BX-1025','赵师傅','2.4 小时','现场维修'],['BX-1023','陈师傅','5.1 小时','等待配件']]},
 '用户账号':{columns:['账号','姓名','角色','账号状态'],rows:[['202602341','林晓屿','学生','启用'],['dm0301','周老师','宿管人员','启用'],['wx008','陈师傅','维修人员','启用']]},
 '权限审计':{columns:['时间','操作账号','权限变更','结果'],rows:[['09.21 09:30','admin','宿管数据范围更新','成功'],['09.20 16:40','admin','新增维修账号权限','成功']]},
 '维修统计':{columns:['故障类型','工单量','完成率','平均耗时'],rows:[['水电','128','96.1%','3.2h'],['家具','76','94.7%','4.6h'],['空调','92','89.1%','12.3h']]},
};
export function ActionWorkspace({ feature, actionId, role }: { feature: RoleFeature; actionId: string; role: RoleId }) {
 const action = feature.actions.find(item => item.id === actionId) ?? feature.actions[0];
 const common = getModuleContent(feature.module, role, feature.id);
 const page = getModuleContent(feature.module, role, feature.id, actionId);
 const fields = forms[action.label];
 const [message, setMessage] = useState('');
 const [query, setQuery] = useState('');
 const [paid, setPaid] = useState(false);
 const [profile, setProfile] = useState(['林晓屿','202602341','南苑 3 栋 · 502 · 02']);
 const [backup, setBackup] = useState(false);
 let table: Table = lists[action.label] ?? page;
 if(action.label === '缴费记录') table={columns:['账单','账期','实付金额','缴费状态'],rows:page.rows.filter(row=>row[3]==='已缴清')};
 if(action.label === '数据恢复') table={columns:['恢复点','范围','完成时间','状态'],rows:common.rows};
 const exportData = () => { const blob = new Blob(['\ufeff' + [table.columns,...table.rows].map(row=>row.map(cell=>'"'+cell.replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=feature.id+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('已导出 CSV 文件。'); };
 const isExport=['数据导出','导出报表'].includes(action.label);
 const isImport=action.label==='批量导入';
 const isPersonal=action.label==='查看个人信息';
 const isPayment=action.label==='在线缴费';
 const isBackup=action.label==='立即备份';
 return <div className={s.workspace}>
   <section className={s.overview} aria-label="功能概况">{common.stats.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
   <ContentSwap identity={feature.id+action.id}><section className={s.panel}>
     <header><h2>{action.label}</h2></header>
     {fields ? <form key={action.id} onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);if(action.label==='修改登录密码' && data.get('新密码')!==data.get('确认新密码')){setMessage('两次输入的新密码不一致。');return;}if(action.label==='修改个人信息')setProfile(previous=>[String(data.get('姓名')),previous[1],previous[2]]);setMessage(action.label+'已保存（本次前端演示）。');}}><div className={s.fields}>{fields.map(field=><label key={field.label}>{field.label}{field.options?<select name={field.label}>{field.options.map(option=><option key={option}>{option}</option>)}</select>:field.type==='textarea'?<textarea name={field.label} required rows={4}/>:<input name={field.label} required type={field.type??'text'} min={field.type==='number'?1:undefined} minLength={field.type==='password'?6:undefined}/>}</label>)}</div><footer><span>仅保存当前演示，不会向后台提交。</span><button>保存{action.label.includes('申请')?'申请':'修改'} →</button></footer></form>
     :isPersonal?<dl className={s.profile}>{['姓名','学号','住宿位置'].map((label,index)=><div key={label}><dt>{label}</dt><dd>{profile[index]}</dd></div>)}</dl>
     :isPayment?<><div className={s.rate}><span>9 月水电费 · 截止 09.28</span><strong>{paid?'已缴清':'¥128.60'}</strong></div><div className={s.jobCard}><span>水费 ¥28.60</span><span>电费 ¥100.00</span></div><footer><span>模拟缴费，不产生真实扣款。</span><button disabled={paid} onClick={()=>{setPaid(true);setMessage('演示缴费已完成。');}}>{paid?'已完成':'确认模拟缴费 →'}</button></footer></>
     :isImport?<form onSubmit={event=>{event.preventDefault();setMessage('已选择导入文件，当前演示不写入业务数据库。');}}><p>上传需要导入的学生、房间或床位数据。</p><label>数据类型<select><option>学生数据</option><option>房间数据</option><option>床位数据</option></select></label><label>CSV 文件<input type="file" accept=".csv" required/></label><footer><span>请选择已整理的 CSV 文件。</span><button>确认文件 →</button></footer></form>
     :isExport?<><p>导出当前功能的演示数据。</p><div className={s.jobCard}><span>{table.rows.length} 条记录 · CSV 格式</span><button onClick={exportData}>下载数据 →</button></div></>
     :isBackup?<><p>创建当前数据库的演示恢复点。</p><div className={s.rate}><strong>{backup?'已完成':'待执行'}</strong><span>范围：全量数据库 · 本次仅演示状态变化</span></div><footer><span>不会执行真实数据库备份。</span><button onClick={()=>{setBackup(true);setMessage('演示备份任务已完成。');}} disabled={backup}>创建演示备份 →</button></footer></>
     :action.label==='智能派工'?<form onSubmit={event=>{event.preventDefault();setMessage('演示派工已确认。');}}><p>根据故障类型和当前工作量选择维修人员。</p><label>待派工单<select><option>BX-1028 · 北苑 608 · 空调</option><option>BX-1027 · 南苑 1F · 排水</option></select></label><label>维修人员<select><option>陈师傅 · 空调 / 水电 · 当前 2 单</option><option>赵师傅 · 家具 / 排水 · 当前 1 单</option></select></label><footer><span>确认后更新本次演示提示。</span><button>确认派工 →</button></footer></form>
     :<><label className={s.search}>搜索记录<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="输入关键词" /></label><div className={s.tableScroll}><table className={s.businessTable}><thead><tr>{table.columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.filter(row=>row.join(' ').includes(query)).map((row,index)=><tr key={row[0]+index}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>{action.label==='数据恢复' && <footer><span>演示恢复不会覆盖真实数据。</span><button onClick={()=>setMessage('已选择最新恢复点进行演示恢复。')}>恢复最新备份 →</button></footer>}</>}
   </section></ContentSwap><p className={s.feedback} role="status">{message}</p>
 </div>;
}
