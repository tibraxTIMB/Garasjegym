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
    # A real manual Samspel result through Training, not a visual fixture.
    ctx=browser.new_context(viewport={"width":390,"height":844},has_touch=True)
    ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
    page=ctx.new_page()
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(URL,wait_until="domcontentloaded")
    page.get_by_role("button",name="Etterregistrering",exact=False).click(timeout=15000)
    page.get_by_role("button",name="WOD frå biblioteket",exact=False).click()
    page.get_by_role("button",name="Audit Quality & Row",exact=False).click()
    save=page.get_by_role("button",name="Lagre økt",exact=True)
    expect(save).to_be_visible(timeout=15000)
    expect(page.get_by_role("heading",name="Quality & Row",exact=True)).to_be_visible()
    expect(page.get_by_role("button",name="Neste øving",exact=False)).to_have_count(0)
    save.click()
    expect(page.get_by_role("alert").filter(has_text="Utøvar 1")).to_be_visible()
    page.locator('[data-result-field="samspel-1-quality"]').select_option("done")
    page.locator('[data-result-field="samspel-2-quality"]').select_option("partial")
    page.locator('[data-result-field="scoreDistance"]').fill("900")
    keypad=page.get_by_role("complementary",name="Garasjegym taltastatur")
    if keypad.is_visible():
        keypad.get_by_role("button",name="Lukk taltastatur").click()
    page.wait_for_function("(key)=>JSON.parse(localStorage.getItem(key)||'{}').scoreDistance==='900'",arg=DRAFT)
    page.reload(wait_until="domcontentloaded")
    expect(save).to_be_visible(timeout=15000)
    expect(page.locator('[data-result-field="samspel-2-quality"]')).to_have_value("partial")
    save.click()
    page.wait_for_function("(key)=>JSON.parse(localStorage.getItem(key)||'[]').length===1",arg=WRITES,timeout=20000)
    payload=page.evaluate("(key)=>JSON.parse(localStorage.getItem(key))[0].payload",WRITES)
    assert payload["score_distance"]==900
    assert payload["score_rounds"] is None and payload["score_reps"] is None
    assert payload["result_data"]["completed"] is False
    assert [r["quality_status"] for r in payload["result_data"]["samspel"]["participant_results"]]==["done","partial"]
    assert not payload["result_data"].get("pr_victories")
    assert not errors,errors
    print("FRONTDIENST Quality & Row: validation, draft reload, partial result and single team payload passed",flush=True)
    ctx.close()
    # Real YGIG result UI: separate participant data and no manufactured PRs.
    ctx=browser.new_context(viewport={"width":390,"height":844},has_touch=True)
    ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
    page=ctx.new_page()
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(URL,wait_until="domcontentloaded")
    page.get_by_role("button",name="Etterregistrering",exact=False).click(timeout=15000)
    page.get_by_role("button",name="WOD frå biblioteket",exact=False).click()
    page.get_by_role("button",name="Audit YGIG EMOM",exact=False).click()
    save=page.get_by_role("button",name="Lagre økt",exact=True)
    expect(save).to_be_visible(timeout=15000)
    section=page.get_by_role("region",name="YGIG EMOM – individuelle bidrag")
    expect(section).to_be_visible()
    expect(section.get_by_text("Bench press · 3 moglege intervall",exact=True).first).to_be_visible()
    section.get_by_role("button",name="Hent plan · 6 reps/intervall",exact=True).first.click()
    expect(page.locator('[data-result-field="samspel-1-paired-0"]')).to_have_value("3")
    expect(page.locator('[data-result-field="samspel-1-paired-reps-0"]')).to_have_value("18")
    page.locator('[data-result-field="samspel-1-paired-reps-0"]').fill("16")
    keypad=page.get_by_role("complementary",name="Garasjegym taltastatur")
    if keypad.is_visible():
        keypad.get_by_role("button",name="Lukk taltastatur").click()
    section.get_by_role("button",name="Hent plan · 6 reps/intervall",exact=True).first.click()
    expect(page.locator('[data-result-field="samspel-1-paired-reps-0"]')).to_have_value("16")
    section.get_by_text("Utøvar 2",exact=True).click()
    section.get_by_role("group",name="Dosering P2").get_by_role("button",name="Scaled",exact=True).click()
    page.locator('[data-result-field="samspel-2-paired-0"]').fill("2")
    if keypad.is_visible():
        keypad.get_by_role("button",name="Lukk taltastatur").click()
    section.get_by_role("button",name="Hent plan · 4 reps/intervall",exact=True).first.click()
    expect(page.locator('[data-result-field="samspel-2-paired-reps-0"]')).to_have_value("8")
    if keypad.is_visible():
        keypad.get_by_role("button",name="Lukk taltastatur").click()
    page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'{}').participantScores?.['2']?.['paired-reps-0']==='8'",arg=DRAFT)
    page.reload(wait_until="domcontentloaded")
    expect(save).to_be_visible(timeout=15000)
    draft=page.evaluate("(k)=>JSON.parse(localStorage.getItem(k))",DRAFT)
    assert draft["participantScores"]["1"]["paired-reps-0"]=="16"
    assert draft["participantScores"]["2"]["paired-reps-0"]=="8"
    save.click()
    page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'[]').length===1",arg=WRITES,timeout=20000)
    payload=page.evaluate("(k)=>JSON.parse(localStorage.getItem(k))[0].payload",WRITES)
    rows=payload["result_data"]["samspel"]["participant_results"]
    assert [row["paired_reps"][0] for row in rows]==[16,8],rows
    assert [row["paired_intervals"][0] for row in rows]==[3,2],rows
    assert [row["prescription_level"] for row in rows]==["rx","scaled"],rows
    assert payload["result_data"]["completed"] is False
    assert not payload["result_data"].get("pr_victories")
    assert payload["score_rounds"] is None and payload["score_reps"] is None
    assert not errors,errors
    print("FRONTDIENST YGIG EMOM: plan fill, manual correction, separate results, reload and partial save passed",flush=True)
    ctx.close()
    # Exercise-library-backed builder and grouped Del 0: actual UI, no live writes.
    ctx=browser.new_context(viewport={"width":390,"height":844},has_touch=True)
    ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
    page=ctx.new_page()
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(BASE+"/ui-audit.html?scenario=audit-admin&screen=builder",wait_until="domcontentloaded")
    page.get_by_role("button",name="Samansett økt",exact=False).first.click(timeout=15000)
    page.get_by_text("ZÜNDUNG · Legg til / byt Del 0",exact=True).click()
    page.get_by_role("combobox",name="Oppvarming",exact=True).select_option("eisenkette",timeout=10000)
    page.get_by_role("combobox",name="Gjennomføring av oppvarming",exact=True).select_option("partner")
    page.get_by_role("button",name="Legg til Del 0",exact=True).click()
    nav=page.get_by_role("navigation",name="Delar i WOD-en")
    expect(nav.get_by_role("button")).to_have_count(5)
    labels=nav.locator("button > b").all_text_contents()
    assert labels==["0.1","0.2","0.3","A","B"],labels
    assert not errors,errors
    ctx.close()
    for w,h in [(390,844),(844,390),(800,1280)]:
        ctx=browser.new_context(viewport={"width":w,"height":h},has_touch=True)
        ctx.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE+"/") else route.abort())
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.on("dialog",lambda dialog:dialog.accept())
        page.goto(URL+"&launch=zuendung",wait_until="domcontentloaded")
        skip=page.get_by_role("button",name="Hopp over Del 0",exact=True)
        expect(skip).to_be_visible(timeout=15000)
        skip.click()
        page.wait_for_function("(k)=>{const d=JSON.parse(localStorage.getItem(k)||'{}');return d.timerSnapshot?.active_block_index===3&&Object.values(d.blockScores||{}).filter(b=>b.status==='skipped').length===3}",arg=DRAFT,timeout=15000)
        draft=page.evaluate("(k)=>JSON.parse(localStorage.getItem(k))",DRAFT)
        assert draft["timerSnapshot"]["hasStarted"] is False
        assert all(draft["timerSnapshot"]["block_results"][str(i)]["prep_skipped"] for i in range(3))
        # Reload without a launch parameter so only the actual persisted draft restores.
        page.goto(URL,wait_until="domcontentloaded")
        expect(skip).to_have_count(0)
        page.wait_for_function("(k)=>JSON.parse(localStorage.getItem(k)||'{}').timerSnapshot?.active_block_index===3",arg=DRAFT,timeout=15000)
        restored=page.evaluate("(k)=>JSON.parse(localStorage.getItem(k))",DRAFT)
        assert all(restored["timerSnapshot"]["block_results"][str(i)]["prep_skipped"] for i in range(3))
        assert page.evaluate("(k)=>localStorage.getItem(k)",WRITES) is None
        assert not errors,errors
        print(f"FRONTDIENST ZÜNDUNG {w}x{h}: actual skip, stored status, no start or save, reload passed",flush=True)
        ctx.close()
    browser.close()
print("FRONTDIENST AUDIT: registration, Quality & Row and ZÜNDUNG journeys passed",flush=True)
