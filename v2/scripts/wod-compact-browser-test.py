"""Actual mobile WOD builder -> catalogue -> keypad -> saved plan payload. Synthetic only."""
import json,re
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:4173'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 for width,height in [(360,800),(390,844),(844,390),(800,1280)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=width<600,locale='nn-NO')
  external=[]
  def route(r):
   if r.request.url.startswith(BASE):r.continue_()
   else:external.append(r.request.url);r.abort()
  ctx.route('**/*',route)
  page=ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/ui-audit.html?scenario=audit-admin&screen=builder-contract')
  wizard=page.locator('.gg-format-wizard')
  wizard.wait_for(timeout=20000)
  wizard.locator('.gg-other-formats summary').click()
  wizard.get_by_role('button',name='Chipper',exact=True).click()
  page.get_by_role('button',name='Utan tidsgrense',exact=True).click()
  page.get_by_role('button',name='Vidare til øvingar',exact=True).click()
  page.get_by_role('button',name='Legg til øving',exact=True).first.click()
  picker=page.get_by_role('region',name='Vel øvingar til WOD')
  try:
   picker.wait_for(timeout=10000)
  except Exception:
   print('PICKER DIAGNOSTICS',errors,page.locator('body').inner_text()[:4000],flush=True)
   raise
  picker.get_by_placeholder("Søk øving, kroppsdel eller utstyr …").fill('Air Squat')
  try:
   picker.get_by_role('button',name='Legg til Air Squat i WOD',exact=True).click(timeout=10000)
   picker.get_by_role('button',name='Legg til Air Squat på nytt. Vald 1 gonger.',exact=True).click(timeout=10000)
  except Exception:
   print('CATALOGUE DIAGNOSTICS',errors,picker.inner_text()[:5000],flush=True)
   raise
  picker.get_by_role('button',name='Ferdig · 2 valde',exact=True).click()
  grid=page.get_by_role('region',name='Snøggdosering')
  grid.wait_for(timeout=10000)
  rows=grid.locator('.gg-compact-dose-row')
  assert rows.count()==2
  rows.first.get_by_role('button',name='Reps',exact=False).click()
  pad=grid.get_by_role('group',name='Numerisk tastatur')
  pad.get_by_role('button',name='2',exact=True).click()
  pad.get_by_role('button',name='5',exact=True).click()
  pad.get_by_role('button',name='Neste felt').click()
  pad.get_by_role('button',name='1',exact=True).click()
  pad.get_by_role('button',name='5',exact=True).click()
  pad.get_by_role('button',name='Lukk tastatur').click()
  grid.get_by_role('button',name='Scaled',exact=True).click()
  rows.first.get_by_role('button',name='Reps',exact=False).click()
  pad.get_by_role('button',name='8',exact=True).click()
  pad.get_by_role('button',name='Lukk tastatur').click()
  page.get_by_role('button',name='Lagringsval',exact=True).last.click()
  page.locator('.wizard-publish-stage button[type=submit]').click()
  try:
   page.wait_for_function("document.querySelector('[data-testid=builder-payload]').textContent.length>0",timeout=10000)
  except Exception:
   print('SAVE DIAGNOSTICS',errors,page.locator('body').inner_text()[:5000],flush=True)
   raise
  payload=json.loads(page.get_by_test_id('builder-payload').text_content())
  s=payload['timer_settings']['workout_schema'];assert payload['format']=='Chipper'
  assert s['time_cap_seconds'] is None
  assert [i['levels']['rx']['reps'] for i in s['items']]==['25','15']
  assert s['items'][0]['levels']['scaled']['reps']=='8'
  assert s['wod_engine']['blocks'][0]['items']==s['items']
  assert not errors,errors
  assert not external,external
  print('PASS actual Chipper duplicate exercise / keypad / independent levels / saved schema',width,height,flush=True)
  ctx.close()
 browser.close()
