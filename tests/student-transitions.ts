import {expect,type Page} from '@playwright/test';

export async function expectStudentReveal(page:Page,navigate:()=>Promise<unknown>,title:string){
  const frame=page.frameLocator('[data-dorma-student-frame]'),content=frame.locator('#docs-info');
  // Run the rAF probe as browser JavaScript, without tsx's Node-only function-name helpers.
  await content.evaluate((element,source)=>new Function('element',source)(element),String.raw`
    const target=element;
    const view=element.ownerDocument.defaultView;
    if(target.motionProbe)view.cancelAnimationFrame(target.motionProbe.raf);
    const probe={samples:[],raf:0};target.motionProbe=probe;
    const until=view.performance.now()+10000;
    const sample=()=>{
      const template=element.getAnimations().some(animation=>{
        const effect=animation.effect;
        const frames=effect.getKeyframes();
        return effect.getTiming().duration===150&&frames[0]?.opacity==='0'&&frames.at(-1)?.opacity==='1';
      });
      probe.samples.push({title:element.querySelector('h1')?.textContent??'',opacity:Number(view.getComputedStyle(element).opacity),template});
      if(view.performance.now()<until)probe.raf=view.requestAnimationFrame(sample);
    };
    sample();
  `);
  try{
    await navigate();
    await expect(frame.locator('#docs-info h1')).toHaveText(title);
    await expect.poll(()=>content.evaluate((element,title)=>{
      const samples=(element as HTMLElement&{motionProbe:{samples:{title:string;opacity:number;template:boolean}[]}}).motionProbe.samples.filter(sample=>sample.title===title);
      return {fading:samples.some(sample=>sample.opacity>0&&sample.opacity<0.95),template:samples.some(sample=>sample.template),visible:samples.some(sample=>sample.opacity===1)};
    },title)).toEqual({fading:true,template:true,visible:true});
  }finally{
    await content.evaluate(element=>{
      const target=element as HTMLElement&{motionProbe?:{raf:number}};
      if(target.motionProbe)element.ownerDocument.defaultView!.cancelAnimationFrame(target.motionProbe.raf);
      delete target.motionProbe;
    });
  }
}

export async function studentTransitionRegression(page:Page){
  const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
  await page.goto(origin+'/workspace/student/personal');
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
  await expectStudentReveal(page,()=>frame.locator('[data-student-module-links] a').first().click(),'查看个人信息');
  await expectStudentReveal(page,()=>frame.locator('#docs-sidebar .docs-action a').filter({hasText:'修改个人信息'}).click(),'修改个人信息');
  await expectStudentReveal(page,()=>frame.locator('#docs-info .next-link a').click(),'修改登录密码');
  await expectStudentReveal(page,()=>page.goBack(),'修改个人信息');
  await expectStudentReveal(page,()=>frame.locator('#docs-info .docs-breadcrumb a').click(),'个人信息');
  await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('查看账单');
  await expectStudentReveal(page,()=>frame.locator('#docs-search-results a').filter({hasText:'查看账单'}).first().click(),'查看账单');
  await page.setViewportSize({width:390,height:844});
  await expectStudentReveal(page,()=>frame.locator('#docs-info .next-link a').click(),'在线缴费');
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
  await page.setViewportSize({width:1440,height:1000});
  console.log('切换动画回归通过：模块入口、侧栏、前后导航、浏览器返回、搜索和手机均使用母版150ms渐显。');
}
