"""Real Training timer; demo backend only."""
import json
from playwright.sync_api import sync_playwright,expect
BASE="http://127.0.0.1:4173"
DRAFT="garasjegym.workout-draft.v1.demo-member"
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for w,h in [(390,844),(844,390),(800,1280)]:
        for complete in [True,False]:
            ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=True)
            ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
            page=ctx.new_page()
            errors=[]
            page.on("pageerror",lambda error:errors.append(str(error)))
            page.clock.install()
            page.goto(BASE+"/ui-audit.html?scenario=audit-frontdienst&screen=training&launch=chipper",wait_until="domcontentloaded")
            try:
                page.get_by_role("button",name="Start hovudøkta",exact=True).click(timeout=15000)
                expect(page.locator(".engine-timer")).to_be_visible(timeout=15000)
                if not page.locator(".gg-live-timer").is_visible():
                    page.get_by_role("button",name="Stor klokke",exact=True).click()
                page.get_by_role("button",name="Start no",exact=True).first.click()
                page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'{}').timerSnapshot?.running===true",arg=DRAFT)
                page.clock.fast_forward(61000)
                progress=page.get_by_role("region",name="Chipper-framdrift")
                expect(progress).to_contain_text("0/2 ferdige")
                progress.get_by_role("button",name="FERDIG · NESTE ØVING",exact=True).click()
                expect(progress).to_contain_text("1/2 ferdige")
                expect(progress).to_contain_text("2000 m")
                page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'{}').timerSnapshot?.chipper_confirmed_count===1",arg=DRAFT)
                if complete:
                    page.clock.fast_forward(2000)
                    progress.get_by_role("button",name="FERDIG · FULLFØR CHIPPER",exact=True).click()
                else:
                    page.locator(".gg-live-timer").get_by_role("button",name="Fullfør Chipper",exact=True).click()
                    dialog=page.get_by_role("dialog",name="Stadfest avslutning")
                    dialog.get_by_role("button",name="Avslutt delvis",exact=True).click()
                page.wait_for_function("([k,expected])=>JSON.parse(localStorage.getItem(k)||'{}').timerSnapshot?.chipper_all_goals_confirmed===expected",arg=[DRAFT,complete])
                expect(page.locator('[data-result-field="chipper-total-0"]')).to_have_value("80")
                expect(page.locator('[data-result-field="chipper-total-1"]')).to_have_value("2000" if complete else "")
                assert page.evaluate("(k)=>localStorage.getItem(k)","gg.audit.frontdienst.writes") is None
                assert not errors,errors
            except Exception:
                print("CHIPPER DIAGNOSTIC",w,h,complete,page.locator("body").inner_text()[:3000],errors,flush=True)
                raise
            finally:
                ctx.close()
    browser.close()
print("Shared Chipper: explicit completion vs partial result, mixed units, three viewports passed.")
