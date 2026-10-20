const entries = [
  {
    "feature": "overview",
    "group": "宿管工作台",
    "color": 0,
    "label": "宿管工作台",
    "id": "docs",
    "action": "overview",
    "url": "/workspace/dormManager",
    "description": "维护基础信息，办理住宿事务，跟进报修与账单。"
  },
  {
    "feature": "base-data",
    "group": "基础信息",
    "color": 0,
    "label": "基础信息",
    "id": "getting-started",
    "action": "overview",
    "url": "/workspace/dormManager/base-data",
    "description": "学生、房间与床位数据保持在同一坐标系。"
  },
  {
    "feature": "base-data",
    "group": "基础信息",
    "color": 0,
    "label": "学生信息",
    "id": "animation-animatable-properties-css-properties",
    "action": "action-1",
    "url": "/workspace/dormManager/base-data/action-1",
    "description": "学生、房间与床位数据保持在同一坐标系。"
  },
  {
    "feature": "base-data",
    "group": "基础信息",
    "color": 0,
    "label": "房间信息",
    "id": "animatable-animatable-methods-setters",
    "action": "action-2",
    "url": "/workspace/dormManager/base-data/action-2",
    "description": "学生、房间与床位数据保持在同一坐标系。"
  },
  {
    "feature": "base-data",
    "group": "基础信息",
    "color": 0,
    "label": "床位信息",
    "id": "animation-animatable-properties-html-attributes",
    "action": "action-3",
    "url": "/workspace/dormManager/base-data/action-3",
    "description": "学生、房间与床位数据保持在同一坐标系。"
  },
  {
    "feature": "accommodation",
    "group": "住宿事务",
    "color": 1,
    "label": "住宿事务",
    "id": "timer",
    "action": "overview",
    "url": "/workspace/dormManager/accommodation",
    "description": "登记、调宿与退宿驱动床位实时变化。"
  },
  {
    "feature": "accommodation",
    "group": "住宿事务",
    "color": 1,
    "label": "入住登记与分配",
    "id": "animation-animatable-properties-css-transforms",
    "action": "action-1",
    "url": "/workspace/dormManager/accommodation/action-1",
    "description": "登记、调宿与退宿驱动床位实时变化。"
  },
  {
    "feature": "accommodation",
    "group": "住宿事务",
    "color": 1,
    "label": "调宿审核",
    "id": "animation-animatable-properties-css-variables",
    "action": "action-2",
    "url": "/workspace/dormManager/accommodation/action-2",
    "description": "登记、调宿与退宿驱动床位实时变化。"
  },
  {
    "feature": "accommodation",
    "group": "住宿事务",
    "color": 1,
    "label": "退宿登记",
    "id": "timer-timer-properties",
    "action": "action-3",
    "url": "/workspace/dormManager/accommodation/action-3",
    "description": "登记、调宿与退宿驱动床位实时变化。"
  },
  {
    "feature": "beds",
    "group": "床位状态",
    "color": 2,
    "label": "床位状态",
    "id": "animation",
    "action": "overview",
    "url": "/workspace/dormManager/beds",
    "description": "状态矩阵直接显示空闲、入住与异常。"
  },
  {
    "feature": "beds",
    "group": "床位状态",
    "color": 2,
    "label": "床位总览",
    "id": "timeline-add-animations",
    "action": "action-1",
    "url": "/workspace/dormManager/beds/action-1",
    "description": "状态矩阵直接显示空闲、入住与异常。"
  },
  {
    "feature": "beds",
    "group": "床位状态",
    "color": 2,
    "label": "状态更新",
    "id": "animation-animatable-properties-javascript-object-properties",
    "action": "action-2",
    "url": "/workspace/dormManager/beds/action-2",
    "description": "状态矩阵直接显示空闲、入住与异常。"
  },
  {
    "feature": "beds",
    "group": "床位状态",
    "color": 2,
    "label": "异常校验",
    "id": "timeline-timeline-properties",
    "action": "action-3",
    "url": "/workspace/dormManager/beds/action-3",
    "description": "状态矩阵直接显示空闲、入住与异常。"
  },
  {
    "feature": "repair-review",
    "group": "报修初审",
    "color": 3,
    "label": "报修初审",
    "id": "timeline",
    "action": "overview",
    "url": "/workspace/dormManager/repair-review",
    "description": "有效工单继续前进，无效信息原路退回。"
  },
  {
    "feature": "repair-review",
    "group": "报修初审",
    "color": 3,
    "label": "待初审工单",
    "id": "animation-animation-playback-settings-reversed",
    "action": "action-1",
    "url": "/workspace/dormManager/repair-review/action-1",
    "description": "有效工单继续前进，无效信息原路退回。"
  },
  {
    "feature": "repair-review",
    "group": "报修初审",
    "color": 3,
    "label": "上报维修",
    "id": "animation-animatable-properties-svg-attributes",
    "action": "action-2",
    "url": "/workspace/dormManager/repair-review/action-2",
    "description": "有效工单继续前进，无效信息原路退回。"
  },
  {
    "feature": "repair-review",
    "group": "报修初审",
    "color": 3,
    "label": "驳回报修",
    "id": "animation-animation-properties",
    "action": "action-3",
    "url": "/workspace/dormManager/repair-review/action-3",
    "description": "有效工单继续前进，无效信息原路退回。"
  },
  {
    "feature": "billing",
    "group": "账单核对",
    "color": 4,
    "label": "账单核对",
    "id": "animatable",
    "action": "overview",
    "url": "/workspace/dormManager/billing",
    "description": "账期、金额与欠费记录逐行对齐。"
  },
  {
    "feature": "billing",
    "group": "账单核对",
    "color": 4,
    "label": "账单核对",
    "id": "timer-timer-playback-settings-duration",
    "action": "action-1",
    "url": "/workspace/dormManager/billing/action-1",
    "description": "账期、金额与欠费记录逐行对齐。"
  },
  {
    "feature": "billing",
    "group": "账单核对",
    "color": 4,
    "label": "欠费名单",
    "id": "animation-animation-callbacks-oncomplete",
    "action": "action-2",
    "url": "/workspace/dormManager/billing/action-2",
    "description": "账期、金额与欠费记录逐行对齐。"
  },
  {
    "feature": "billing",
    "group": "账单核对",
    "color": 4,
    "label": "催缴记录",
    "id": "timeline-add-timers",
    "action": "action-3",
    "url": "/workspace/dormManager/billing/action-3",
    "description": "账期、金额与欠费记录逐行对齐。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 5,
    "label": "个人中心",
    "id": "draggable",
    "action": "overview",
    "url": "/workspace/dormManager/personal",
    "description": "维护个人资料、密码和通知。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 5,
    "label": "查看个人信息",
    "id": "animation-animation-methods-refresh",
    "action": "action-1",
    "url": "/workspace/dormManager/personal/action-1",
    "description": "维护个人资料、密码和通知。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 5,
    "label": "修改个人信息",
    "id": "timer-timer-callbacks-onbegin",
    "action": "action-2",
    "url": "/workspace/dormManager/personal/action-2",
    "description": "维护个人资料、密码和通知。"
  },
  {
    "feature": "personal",
    "group": "个人中心",
    "color": 5,
    "label": "修改登录密码",
    "id": "timer-timer-callbacks-onupdate",
    "action": "action-3",
    "url": "/workspace/dormManager/personal/action-3",
    "description": "维护个人资料、密码和通知。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 6,
    "label": "个人消息",
    "id": "layout",
    "action": "overview",
    "url": "/workspace/dormManager/notifications",
    "description": "接收业务进度与待办提醒。"
  },
  {
    "feature": "notifications",
    "group": "个人消息",
    "color": 6,
    "label": "消息通知",
    "id": "timeline-timeline-methods-seek",
    "action": "action-1",
    "url": "/workspace/dormManager/notifications/action-1",
    "description": "接收业务进度与待办提醒。"
  }
];
export default entries;
