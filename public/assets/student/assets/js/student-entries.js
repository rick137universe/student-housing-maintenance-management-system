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
    "url": "/workspace/student/personal/profile",
    "description": "查看账号资料和当前住宿记录。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "修改个人信息",
    "id": "animatable-animatable-methods-setters",
    "action": "action-2",
    "url": "/workspace/student/personal/edit-profile",
    "description": "修改姓名、联系电话及邮箱。"
  },
  {
    "feature": "personal",
    "group": "个人信息",
    "color": 0,
    "label": "修改登录密码",
    "id": "animation-animatable-properties-html-attributes",
    "action": "action-3",
    "url": "/workspace/student/personal/change-password",
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
    "url": "/workspace/student/accommodation/check-in",
    "description": "提交入住申请，选择意向楼栋和期望入住日期。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "提交入住申请",
    "id": "animation-animatable-properties-css-variables",
    "action": "action-1/submit",
    "parent": "animation-animatable-properties-css-transforms",
    "kind": "submit",
    "url": "/workspace/student/accommodation/check-in/submit",
    "description": "填写意向楼栋、期望办理日期及申请说明，确认后提交入住申请。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "入住申请记录",
    "id": "timer-timer-properties",
    "action": "action-1/records",
    "parent": "animation-animatable-properties-css-transforms",
    "url": "/workspace/student/accommodation/check-in/records",
    "description": "查看已提交的入住申请及审核结果。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "调宿申请",
    "id": "timeline-add-animations",
    "action": "action-2",
    "url": "/workspace/student/accommodation/room-change",
    "description": "提交调宿意向，审核通过后完成床位变更。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "提交调宿申请",
    "id": "animation-animatable-properties-javascript-object-properties",
    "action": "action-2/submit",
    "parent": "timeline-add-animations",
    "kind": "submit",
    "url": "/workspace/student/accommodation/room-change/submit",
    "description": "填写意向楼栋、期望办理日期及申请说明，确认后提交调宿申请。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "调宿申请记录",
    "id": "timeline-timeline-properties",
    "action": "action-2/records",
    "parent": "timeline-add-animations",
    "url": "/workspace/student/accommodation/room-change/records",
    "description": "查看调宿申请、审核意见及床位变更结果。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "退宿申请",
    "id": "animation-animation-playback-settings-reversed",
    "action": "action-3",
    "url": "/workspace/student/accommodation/check-out",
    "description": "提交退宿申请，填写期望办理日期和申请说明。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "提交退宿申请",
    "id": "animation-animatable-properties-svg-attributes",
    "action": "action-3/submit",
    "parent": "animation-animation-playback-settings-reversed",
    "kind": "submit",
    "url": "/workspace/student/accommodation/check-out/submit",
    "description": "填写期望办理日期及申请说明，确认后提交退宿申请。"
  },
  {
    "feature": "accommodation",
    "group": "住宿业务",
    "color": 1,
    "label": "退宿申请记录",
    "id": "animation-animation-properties",
    "action": "action-3/records",
    "parent": "animation-animation-playback-settings-reversed",
    "url": "/workspace/student/accommodation/check-out/records",
    "description": "查看退宿申请及办理结果。"
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
    "url": "/workspace/student/payment/bills",
    "description": "查看住宿费、水电费和账单余额。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "在线缴费",
    "id": "animation-animation-callbacks-oncomplete",
    "action": "action-2",
    "url": "/workspace/student/payment/online-payment",
    "description": "选择未缴清账单进行测试支付，不产生真实扣款。"
  },
  {
    "feature": "payment",
    "group": "缴费管理",
    "color": 2,
    "label": "缴费记录",
    "id": "timeline-add-timers",
    "action": "action-3",
    "url": "/workspace/student/payment/payment-history",
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
    "url": "/workspace/student/repair/requests",
    "description": "选择当前住宿房间，填写故障情况与联系方式。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "提交报修申请",
    "id": "timer-timer-callbacks-onbegin",
    "action": "action-1/submit",
    "parent": "animation-animation-methods-refresh",
    "kind": "repair-submit",
    "url": "/workspace/student/repair/requests/submit",
    "description": "选择本人住宿房间，填写故障信息及联系电话，确认后提交申请。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "提交报修记录",
    "id": "timer-timer-callbacks-onupdate",
    "action": "action-1/records",
    "parent": "animation-animation-methods-refresh",
    "kind": "repair-records",
    "url": "/workspace/student/repair/requests/records",
    "description": "查看本人提交的报修申请、审核状态及详细信息。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "查看进度",
    "id": "timeline-timeline-methods-seek",
    "action": "action-2",
    "url": "/workspace/student/repair/progress",
    "description": "查询报修审核、派工和维修处理进度。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "当前报修进度",
    "id": "animation-animation-callbacks-onupdate",
    "action": "action-2/current",
    "parent": "timeline-timeline-methods-seek",
    "kind": "repair-current",
    "url": "/workspace/student/repair/progress/current",
    "description": "查看正在审核、派工和维修中的工单及处理过程。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "报修进度记录",
    "id": "animation-animation-callbacks-onloop",
    "action": "action-2/records",
    "parent": "timeline-timeline-methods-seek",
    "kind": "repair-records",
    "url": "/workspace/student/repair/progress/records",
    "description": "查看已结束报修的审核结果、维修过程和完工信息。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "服务评价",
    "id": "utilities-stagger-stagger-parameters-stagger-grid",
    "action": "action-3",
    "url": "/workspace/student/repair/reviews",
    "description": "对已完成的报修服务评价，每次处理可评价一次。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "提交服务评价",
    "id": "animation-animation-callbacks-onpause",
    "action": "action-3/submit",
    "parent": "utilities-stagger-stagger-parameters-stagger-grid",
    "kind": "repair-evaluate",
    "url": "/workspace/student/repair/reviews/submit",
    "description": "选择本人已完工且未评价的报修，填写评分及评价内容。"
  },
  {
    "feature": "repair",
    "group": "报修服务",
    "color": 3,
    "label": "服务评价记录",
    "id": "animation-animation-callbacks-then",
    "action": "action-3/records",
    "parent": "utilities-stagger-stagger-parameters-stagger-grid",
    "kind": "repair-records",
    "url": "/workspace/student/repair/reviews/records",
    "description": "查看已提交的服务评分、评价内容及对应维修信息。"
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
    "url": "/workspace/student/announcements/notices",
    "description": "查看与本人住宿楼栋相关的公寓公告。"
  },
  {
    "feature": "announcements",
    "group": "公告查看",
    "color": 4,
    "label": "缴费提醒",
    "id": "timer-timer-callbacks-oncomplete",
    "action": "action-2",
    "url": "/workspace/student/announcements/payment-reminders",
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
    "url": "/workspace/student/notifications/messages",
    "description": "查看业务消息并标记已读。"
  }
];
export default entries;
