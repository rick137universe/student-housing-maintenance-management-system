const entries = [
  {
    "feature": "overview",
    "group": "维修工作台",
    "color": 0,
    "label": "维修工作台",
    "id": "docs",
    "action": "overview",
    "url": "/workspace/maintenance",
    "description": "接收维修工单，记录处理进展，查看维修记录与个人统计。"
  },
  {
    "feature": "orders",
    "group": "工单接收",
    "color": 0,
    "label": "工单接收",
    "id": "getting-started",
    "action": "overview",
    "url": "/workspace/maintenance/orders",
    "description": "派发工单沿轨道进入你的处理队列。"
  },
  {
    "feature": "orders",
    "group": "工单接收",
    "color": 0,
    "label": "查看工单",
    "id": "animation-animatable-properties-css-properties",
    "action": "action-1",
    "url": "/workspace/maintenance/orders/action-1",
    "description": "查看本人获派工单的报修资料和处理进度。"
  },
  {
    "feature": "orders",
    "group": "工单接收",
    "color": 0,
    "label": "确认接单",
    "id": "animatable-animatable-methods-setters",
    "action": "action-2",
    "url": "/workspace/maintenance/orders/action-2",
    "description": "核对待接单工单的报修信息并确认接单。"
  },
  {
    "feature": "repair",
    "group": "维修处理",
    "color": 1,
    "label": "维修处理",
    "id": "timer",
    "action": "overview",
    "url": "/workspace/maintenance/repair",
    "description": "记录维修处理进展，跟进任务直到完成。"
  },
  {
    "feature": "repair",
    "group": "维修处理",
    "color": 1,
    "label": "开始维修",
    "id": "animation-animatable-properties-html-attributes",
    "action": "action-1",
    "url": "/workspace/maintenance/repair/action-1",
    "description": "记录维修处理进展，跟进任务直到完成。"
  },
  {
    "feature": "repair",
    "group": "维修处理",
    "color": 1,
    "label": "更新状态",
    "id": "animation-animatable-properties-css-transforms",
    "action": "action-2",
    "url": "/workspace/maintenance/repair/action-2",
    "description": "记录维修处理进展，跟进任务直到完成。"
  },
  {
    "feature": "repair",
    "group": "维修处理",
    "color": 1,
    "label": "完成工单",
    "id": "animation-animatable-properties-css-variables",
    "action": "action-3",
    "url": "/workspace/maintenance/repair/action-3",
    "description": "记录维修处理进展，跟进任务直到完成。"
  },
  {
    "feature": "records",
    "group": "维修记录",
    "color": 2,
    "label": "维修记录",
    "id": "animation",
    "action": "overview",
    "url": "/workspace/maintenance/records",
    "description": "处理说明逐行写入并完成归档。"
  },
  {
    "feature": "records",
    "group": "维修记录",
    "color": 2,
    "label": "填写记录",
    "id": "timer-timer-properties",
    "action": "action-1",
    "url": "/workspace/maintenance/records/action-1",
    "description": "填写本人处理中工单的维修说明。"
  },
  {
    "feature": "records",
    "group": "维修记录",
    "color": 2,
    "label": "维修归档",
    "id": "timeline-add-animations",
    "action": "action-2",
    "url": "/workspace/maintenance/records/action-2",
    "description": "查看已完工或已评价的维修归档。"
  },
  {
    "feature": "analytics",
    "group": "个人统计",
    "color": 3,
    "label": "个人统计",
    "id": "timeline",
    "action": "overview",
    "url": "/workspace/maintenance/analytics",
    "description": "工作量、完成率与评价形成同一组刻度。"
  },
  {
    "feature": "analytics",
    "group": "个人统计",
    "color": 3,
    "label": "工作量统计",
    "id": "animation-animatable-properties-javascript-object-properties",
    "action": "action-1",
    "url": "/workspace/maintenance/analytics/action-1",
    "description": "工作量、完成率与评价形成同一组刻度。"
  },
  {
    "feature": "analytics",
    "group": "个人统计",
    "color": 3,
    "label": "完成率",
    "id": "timeline-timeline-properties",
    "action": "action-2",
    "url": "/workspace/maintenance/analytics/action-2",
    "description": "工作量、完成率与评价形成同一组刻度。"
  },
  {
    "feature": "analytics",
    "group": "个人统计",
    "color": 3,
    "label": "服务评价",
    "id": "animation-animation-playback-settings-reversed",
    "action": "action-3",
    "url": "/workspace/maintenance/analytics/action-3",
    "description": "工作量、完成率与评价形成同一组刻度。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 4,
    "label": "个人中心",
    "id": "animatable",
    "action": "overview",
    "url": "/workspace/maintenance/personal",
    "description": "维护个人资料、密码和通知。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 4,
    "label": "查看个人信息",
    "id": "animation-animatable-properties-svg-attributes",
    "action": "action-1",
    "url": "/workspace/maintenance/personal/action-1",
    "description": "查看本人的账号、姓名、角色和联系方式。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 4,
    "label": "修改个人信息",
    "id": "animation-animation-properties",
    "action": "action-2",
    "url": "/workspace/maintenance/personal/action-2",
    "description": "修改姓名、联系电话及邮箱。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 4,
    "label": "修改登录密码",
    "id": "timer-timer-playback-settings-duration",
    "action": "action-3",
    "url": "/workspace/maintenance/personal/action-3",
    "description": "依次填写并确认三项密码，完成后重新登录。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 5,
    "label": "个人消息",
    "id": "draggable",
    "action": "overview",
    "url": "/workspace/maintenance/notifications",
    "description": "接收业务进度与待办提醒。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 5,
    "label": "消息通知",
    "id": "animation-animation-callbacks-oncomplete",
    "action": "action-1",
    "url": "/workspace/maintenance/notifications/action-1",
    "description": "查看业务消息并标记已读。"
  }
];
export default entries;
