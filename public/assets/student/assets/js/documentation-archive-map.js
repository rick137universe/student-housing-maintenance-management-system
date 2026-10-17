// Application routes supplied to the unchanged Docs runtime.
const routes = {
  "/workspace/student/personal/action-1": "/assets/student/pages/personal-action-1.html",
  "/workspace/student/personal/action-2": "/assets/student/pages/personal-action-2.html",
  "/workspace/student/personal/action-3": "/assets/student/pages/personal-action-3.html",
  "/workspace/student/accommodation/action-1": "/assets/student/pages/accommodation-action-1.html",
  "/workspace/student/accommodation/action-2": "/assets/student/pages/accommodation-action-2.html",
  "/workspace/student/accommodation/action-3": "/assets/student/pages/accommodation-action-3.html",
  "/workspace/student/payment/action-1": "/assets/student/pages/payment-action-1.html",
  "/workspace/student/payment/action-2": "/assets/student/pages/payment-action-2.html",
  "/workspace/student/payment/action-3": "/assets/student/pages/payment-action-3.html",
  "/workspace/student/repair/action-1": "/assets/student/pages/repair-action-1.html",
  "/workspace/student/repair/action-2": "/assets/student/pages/repair-action-2.html",
  "/workspace/student/repair/action-3": "/assets/student/pages/repair-action-3.html",
  "/workspace/student/announcements/action-1": "/assets/student/pages/announcements-action-1.html",
  "/workspace/student/announcements/action-2": "/assets/student/pages/announcements-action-2.html",
  "/workspace/student/notifications/action-1": "/assets/student/pages/notifications-action-1.html"
};
export const documentationArchivePath = url => routes[new URL(url, location.href).pathname] ?? url;
