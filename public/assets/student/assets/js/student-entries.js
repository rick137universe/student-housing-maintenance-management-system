const entries = [
  {
    "feature": "overview",
    "group": "学生工作台",
    "color": 0,
    "label": "学生工作台",
    "id": "docs",
    "action": "overview",
    "url": "/workspace/student",
    "description": "查看个人信息，办理住宿、缴费与报修业务。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "个人信息",
    "id": "getting-started",
    "action": "overview",
    "url": "/workspace/student/personal",
    "description": "查看和维护个人资料、联系方式与登录密码。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "查看个人信息",
    "id": "animation-animatable-properties-css-properties",
    "action": "action-1",
    "url": "/workspace/student/personal/action-1",
    "description": "查看账号资料和当前住宿记录。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "修改个人信息",
    "id": "animatable-animatable-methods-setters",
    "action": "action-2",
    "url": "/workspace/student/personal/action-2",
    "description": "修改姓名、联系电话及邮箱。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "修改登录密码",
    "id": "animation-animatable-properties-html-attributes",
    "action": "action-3",
    "url": "/workspace/student/personal/action-3",
    "description": "依次填写并确认三项密码，完成后重新登录。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "住宿业务",
    "id": "timer",
    "action": "overview",
    "url": "/workspace/student/accommodation",
    "description": "提交入住、调宿和退宿申请，查询办理结果。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "入住申请",
    "id": "animation-animatable-properties-css-transforms",
    "action": "action-1",
    "url": "/workspace/student/accommodation/action-1",
    "description": "提交入住申请，选择意向楼栋并查看审核结果。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "调宿申请",
    "id": "timeline-add-animations",
    "action": "action-2",
    "url": "/workspace/student/accommodation/action-2",
    "description": "提交调宿意向，审核通过后完成床位变更。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "退宿申请",
    "id": "animation-animation-playback-settings-reversed",
    "action": "action-3",
    "url": "/workspace/student/accommodation/action-3",
    "description": "申请退宿并查看办理结果。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "缴费管理",
    "id": "animation",
    "action": "overview",
    "url": "/workspace/student/payment",
    "description": "查询账单、办理测试支付并查看缴费记录。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "查看账单",
    "id": "timer-timer-playback-settings-duration",
    "action": "action-1",
    "url": "/workspace/student/payment/action-1",
    "description": "查看住宿费、水电费和账单余额。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "在线缴费",
    "id": "animation-animation-callbacks-oncomplete",
    "action": "action-2",
    "url": "/workspace/student/payment/action-2",
    "description": "选择未缴清账单进行测试支付，不产生真实扣款。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "缴费记录",
    "id": "timeline-add-timers",
    "action": "action-3",
    "url": "/workspace/student/payment/action-3",
    "description": "查询已经入账的缴费记录。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "报修服务",
    "id": "timeline",
    "action": "overview",
    "url": "/workspace/student/repair",
    "description": "提交报修、跟进维修进度并评价服务。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "提交报修",
    "id": "animation-animation-methods-refresh",
    "action": "action-1",
    "url": "/workspace/student/repair/action-1",
    "description": "选择当前住宿房间，填写故障情况与联系方式。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "查看进度",
    "id": "timeline-timeline-methods-seek",
    "action": "action-2",
    "url": "/workspace/student/repair/action-2",
    "description": "查询报修审核、派工和维修处理进度。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "服务评价",
    "id": "utilities-stagger-stagger-parameters-stagger-grid",
    "action": "action-3",
    "url": "/workspace/student/repair/action-3",
    "description": "对已完成的报修服务评价，每次处理可评价一次。"
  },
  {
    "feature": "announcements",
    "group": "公告查看",
    "color": 4,
    "label": "公告查看",
    "id": "animatable",
    "action": "overview",
    "url": "/workspace/student/announcements",
    "description": "查看公寓公告与缴费提醒。"
  },
  {
    "feature": "announcements",
    "group": "公告查看",
    "color": 4,
    "label": "公寓通知",
    "id": "text-splittext",
    "action": "action-1",
    "url": "/workspace/student/announcements/action-1",
    "description": "查看与本人住宿楼栋相关的公寓公告。"
  },
  {
    "feature": "announcements",
    "group": "公告查看",
    "color": 4,
    "label": "缴费提醒",
    "id": "timer-timer-callbacks-oncomplete",
    "action": "action-2",
    "url": "/workspace/student/announcements/action-2",
    "description": "查看缴费事项与催缴通知。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 5,
    "label": "个人消息",
    "id": "draggable",
    "action": "overview",
    "url": "/workspace/student/notifications",
    "description": "查看业务通知并标记已读。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 5,
    "label": "消息通知",
    "id": "timeline-call-functions",
    "action": "action-1",
    "url": "/workspace/student/notifications/action-1",
    "description": "查看业务消息并标记已读。"
  }
];
export default entries;
