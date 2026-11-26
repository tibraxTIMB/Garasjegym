"""Isolated Training UI save/reload/offline audit. Never contacts the live database."""
import json
from playwright.sync_api import sync_playwright, expect
BASE="http://127.0.0.1:4173"
DRAFT="garasjegym.workout-draft.v1.demo-member"
WRITES="gg.audit.frontdienst.writes"
ATTEMPTS="gg.audit.frontdienst.attempts"
URL=BASE+"/ui-audit.html?scenario=audit-frontdienst&screen=training"
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for w,h in [(390,844),(800,1280),(844,390)]:
        ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=True)
        ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.on("console",lambda msg: print("BROWSER",msg.type,msg.text[:1000],flush=True) if msg.type=="error" else None)
        page.on("pageerror",lambda error:print("BROWSER EXCEPTION",str(error),flush=True))
        # Create the workout through the actual user interface, rather than injecting
        # an incomplete artificial draft. This also verifies initial registration.
        page.goto(URL,wait_until="domcontentloaded")
        page.get_by_role("button",name="Etterregistrering",exact=False).click(timeout=15000)
        page.get_by_role("button",name="Fri trening",exact=False).click()
        page.get_by_role("button",name="Legg til eiga øving").click()
        page.get_by_role("textbox",name="Namn på øving").fill("Back Squat")
        page.get_by_placeholder("Reps",exact=True).fill("5")
        page.get_by_role("spinbutton",name="Belastning i kilo, sett 1").fill("20")
        page.get_by_role("button",name="Kontroller og lagre",exact=True).click()
        page.get_by_role("button",name="Kontroller resultat",exact=True).click()
        save=page.get_by_role("button",name="Lagre økt",exact=True)
        expect(save).to_be_visible(timeout=15000)
        page.locator('[data-result-field="scoreRounds"]').fill("2")
        page.locator('[data-result-field="scoreReps"]').fill("3")
        # Dismiss the custom keypad before opening the discard confirmation.
        keypad=page.get_by_role("complementary",name="Garasjegym taltastatur")
        if keypad.is_visible():
            keypad.get_by_role("button",name="Lukk taltastatur").click()
        page.wait_for_function("(key)=>JSON.parse(localStorage.getItem(key)||'{}').scoreRounds==='2'",arg=DRAFT)
        # Reload and verify that all data is still present.
        page.reload(wait_until="domcontentloaded")
        expect(save).to_be_visible(timeout=15000)
        draft=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key))",DRAFT)
        assert draft["items"][0]["sets"][0]["load_kg"]=="20"
        assert draft["scoreRounds"]=="2"
        # Reject a discard confirmation and retain the same draft.
        page.get_by_role("button",name="Avbryt registrering · ikkje lagre").click()
        dialog=page.get_by_role("alertdialog")
        expect(dialog).to_be_visible()
        dialog.get_by_role("button",name="Hald fram").click()
        expect(save).to_be_visible()
        # A verified offline save must never call the mock server.
        ctx.set_offline(True)
        page.wait_for_function("navigator.onLine===false")
        save.click()
        expect(page.get_by_role("status").filter(has_text="Ventar på nett")).to_be_visible(timeout=10000)
        expect(save).to_be_enabled()
        assert page.evaluate("(key)=>localStorage.getItem(key)",WRITES) is None
        assert page.evaluate("(key)=>localStorage.getItem(key)",DRAFT) is not None
        # Restore connectivity, allow the app's actual retry handler to save.
        ctx.set_offline(False)
        page.wait_for_function("(key)=>JSON.parse(localStorage.getItem(key)||'[]').length===1",arg=WRITES,timeout=25000)
        expect(save).not_to_be_visible(timeout=10000)
        page.wait_for_function("(key)=>localStorage.getItem(key)===null",arg=DRAFT)
        rows=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key))",WRITES)
        assert rows[0]["payload"]["exercises"][0]["sets"][0]["load_kg"]==20
        assert rows[0]["payload"]["exercises"][0]["sets"][0]["reps"]==5
        assert rows[0]["payload"]["score_rounds"]==2
        assert page.evaluate("(key)=>Number(localStorage.getItem(key))",ATTEMPTS)==1
        assert not errors,errors
        print(f"FRONTDIENST {w}x{h}: restore, discard cancel, offline save, reconnect, exact payload and single RPC passed",flush=True)
        ctx.close()
    browser.close()
print("FRONTDIENST AUDIT: 3 viewports passed",flush=True)
