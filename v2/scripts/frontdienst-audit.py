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
        # Seed one synthetic already-performed workout, then use the real result UI.
        page.add_init_script("""() => {
          if(sessionStorage.getItem('frontdienst-seeded'))return;
          sessionStorage.setItem('frontdienst-seeded','1');
          localStorage.setItem('garasjegym.workout-draft.v1.demo-member',JSON.stringify({
            version:1,memberId:'demo-member',mode:'active',manualEntry:true,manualLibraryEntry:false,
            title:'Frontdienst test',format:'Fri trening',saveToken:crypto.randomUUID(),
            finishOpen:true,resultSummary:true,scoreRounds:'2',scoreReps:'3',
            timerSnapshot:{elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false},
            items:[{key:'test-squat',exercise_name:'Back Squat',uses_load:true,rowValue:'',rowUnit:'m',
              sets:[{reps:'5',load_kg:'20',time_text:'',time_seconds:'',height_cm:''}]}],
            reviewedResults:{'test-squat':true},savedAt:Date.now()
          }));
        }""")
        page.goto(URL,wait_until="domcontentloaded")
        save=page.get_by_role("button",name="Lagre økt",exact=True)
        expect(save).to_be_visible(timeout=15000)
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
