"""Session queue with the actual Training component and isolated WOD catalogue."""
from playwright.sync_api import sync_playwright,expect
BASE="http://127.0.0.1:4173"
DRAFT="garasjegym.workout-draft.v1.demo-member"
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(320,568),(390,844),(844,390),(800,1280)]:
  ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=True)
  ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
  page=ctx.new_page();errors=[]
  page.on("pageerror",lambda e:errors.append(str(e)))
  try:
   page.goto(BASE+"/ui-audit.html?scenario=audit-frontdienst&screen=training")
   page.get_by_role("button",name="Vel WOD-ar til økta",exact=False).click(timeout=15000)
   queue=page.get_by_role("region",name="Set saman økt")
   queue.get_by_role("button",name="Oppvarming",exact=True).click()
   queue.get_by_role("button",name="Legg til Audit Quality & Row",exact=True).click()
   queue.get_by_role("button",name="Hovud-WOD",exact=True).click()
   queue.get_by_role("button",name="Legg til Audit Svart Motor",exact=True).click()
   selected=queue.locator(".gg-session-selected-row")
   expect(selected).to_have_count(2)
   queue.get_by_role("button",name="Øvingar i Audit Quality & Row",exact=True).click()
   expect(queue.get_by_role("region",name="Øvingar i Audit Quality & Row")).to_be_visible()
   queue.get_by_role("button",name="Lukk øvingsinfo",exact=True).click()
   queue.get_by_role("button",name="Flytt Audit Svart Motor opp",exact=True).click()
   expect(selected.first).to_contain_text("Audit Svart Motor")
   queue.get_by_role("button",name="Flytt Audit Svart Motor ned",exact=True).click()
   expect(selected.first).to_contain_text("Audit Quality & Row")
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),(w,h)
   queue.get_by_role("button",name="Gjer klar økta",exact=True).click()
   page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'{}').source?.session_wod_ids?.length===2",arg=DRAFT)
   draft=page.evaluate("(k)=>JSON.parse(localStorage.getItem(k))",DRAFT)
   assert draft["source"]["session_wod_ids"]==["audit-quality","audit-shared-chipper"]
   assert "id" not in draft["source"]
   blocks=draft["source"]["timer_settings"]["workout_schema"]["wod_engine"]["blocks"]
   assert blocks[0]["warmup_group"] and blocks[1]["samspel"]["targets"][1]["unit"]=="m"
   assert blocks[1]["session_timer_settings"]["workout_schema"]["time_cap_seconds"]==1200
   assert not errors,errors
  except Exception:
   print("SESSION COMPOSER",w,h,page.locator("body").inner_text()[:3500],errors,flush=True)
   raise
  finally:
   ctx.close()
 browser.close()
print("Session selection, ordering, warmup and exact native Chipper timer snapshot passed.")
