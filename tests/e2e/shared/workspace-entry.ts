import {expect,type Page,type Route} from '@playwright/test';

export async function delayedWorkspaceHydration(page:Page,origin:string){
  const chunks=/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/;
  const delay=async(route:Route)=>{await new Promise(resolve=>setTimeout(resolve,1000));await route.continue();};
  await page.route(chunks,delay);
  try{
    // The server-rendered Docs iframe can finish before the parent's JavaScript.
    // Its same-origin handshake must still mount real business content afterwards.
    await page.goto(origin+'/workspace/student/personal/profile');
    const frame=page.frameLocator('[data-dorma-student-frame]');
    await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();
    await expect(frame.locator('[data-dorma-profile] code').first()).toHaveText('stu202602341');
    await expect(page.getByText('正在确认身份…',{exact:true})).toHaveCount(0);
  }finally{await page.unroute(chunks,delay);}
}
