"""Runs the built, actual App in a separate synthetic backend. No remote requests."""
import json
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:4182'
WOD={'name':'Ingeniørprøve AMRAP','format':'AMRAP','duration_minutes':4,'movements':'10 Air squat','timer_settings':{'workout_schema':{'version':6,'format':'AMRAP','duration_seconds':240,'items':[{'exercise_id':'lab-ex','exercise_name':'Air squat','category':'Styrke','equipment':'Kroppsvekt','sort_order':1,'reps':10}]}}}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1440,'height':900},color_scheme='dark')
 external=[]
 def route_request(route):
  if route.request.url.startswith(BASE):route.continue_()
  else:external.append(route.request.url);route.abort()
 context.route('**/*',route_request)
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.type+': '+m.text) if m.type=='error' else None)
 page.goto(BASE+'/host.html')
 page.evaluate("""() => {localStorage.setItem('production-sentinel','unchanged');window.labReady=false;window.addEventListener('message',e=>{if(e.data?.channel==='gg-werkstatt-tablet-v1'&&e.data.type==='ready')window.labReady=true});const f=document.createElement('iframe');f.id='lab';f.width=800;f.height=1280;f.src='/Garasjegym/tablet-lab.html';document.body.append(f)}""")
 page.wait_for_function('window.labReady===true',timeout=30000)
 frame=page.frame_locator('#lab')
 frame.get_by_text('TESTLAB · ingen resultat blir lagra i produksjon',exact=True).wait_for()
 child=page.frames[-1]
 assert child.evaluate("localStorage.getItem('production-sentinel')") is None
 child.evaluate("localStorage.setItem('production-sentinel','test-only')")
 assert page.evaluate("localStorage.getItem('production-sentinel')")=='unchanged'
 page.evaluate("""wod=>document.getElementById('lab').contentWindow.postMessage({channel:'gg-werkstatt-tablet-v1',type:'wod',wod},location.origin)""",WOD)
 try:
  child.wait_for_function("document.documentElement.dataset.ggLabContent==='wod'",timeout=10000)
  frame.get_by_role('button',name='Utfør WOD',exact=True).wait_for(timeout=30000)
 except Exception:
  print('LAB DIAGNOSTICS',json.dumps({'body':child.locator('body').inner_text()[:6000],'errors':errors,'dataset':child.evaluate('({...document.documentElement.dataset})')},ensure_ascii=False),flush=True)
  page.screenshot(path='ui-audit-results/tablet-lab-failure.png')
  raise
 assert frame.get_by_role('dialog').get_by_text('Ingeniørprøve AMRAP',exact=True).count()>=1
 assert child.evaluate("document.documentElement.dataset.ggDevice")=='tablet'
 assert child.evaluate("document.documentElement.dataset.ggOrientation")=='portrait'
 frame.get_by_role('button',name='Utfør WOD',exact=True).click()
 frame.get_by_role('button',name='Start',exact=True).wait_for(timeout=20000)
 frame.get_by_role('button',name='Start',exact=True).click()
 page.screenshot(path='ui-audit-results/tablet-lab-actual-timer.png')
 # A fresh document tests plan preview without overwriting an active test session.
 page.evaluate("window.labReady=false;document.getElementById('lab').src='/Garasjegym/tablet-lab.html?reset=1'")
 page.wait_for_function('window.labReady===true',timeout=30000)
 plan={'kind':'plan','title':'Ingeniørprøve plan','weeks':2,'sessions':[{'id':'lab-plan-session-1','sequence_no':1,'week_no':2,'day_no':1,'title':'Prøveøkt plan','estimated_minutes':30,'session_kind':'training','status':'planned','wod_id':None,'workout_snapshot':None}],'wods':[]}
 page.evaluate("""plan=>document.getElementById('lab').contentWindow.postMessage({channel:'gg-werkstatt-tablet-v1',type:'plan',plan},location.origin)""",plan)
 frame.get_by_text('Ingeniørprøve plan',exact=True).wait_for(timeout=30000)
 page.screenshot(path='ui-audit-results/tablet-lab-actual-plan.png')
 assert not external,external
 print('Tablet Lab: storage isolation, actual WOD card/timer, actual plan, no remote requests passed')
 browser.close()
