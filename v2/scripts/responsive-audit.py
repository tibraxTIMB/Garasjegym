"""Browser audit using only local synthetic data. Block all other network requests."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE="http://127.0.0.1:4173"
OUT=Path("ui-audit-results")
OUT.mkdir(exist_ok=True)
sizes=[(320,568),(360,800),(390,844),(412,915),(844,390),(800,1280),(1280,800)]
report=[]
failures=[]
def inspect(page):
    return page.evaluate("""() => {
      const view=document.documentElement.clientWidth;
      const root=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
      const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0};
      const overflow=[...document.querySelectorAll('button,input,select,textarea,h1,h2,h3,label')]
        .filter(e=>visible(e)&&!e.closest('[aria-hidden=true]')&&e.getBoundingClientRect().right>view+3&&e.getBoundingClientRect().left>=0)
        .filter(e=>!e.closest('.pt2-tabs,.hub-tabs,.gg-live-timer__lap-preview,[role=tablist]'))
        .slice(0,10).map(e=>({tag:e.tagName,text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,90),right:Math.round(e.getBoundingClientRect().right)}));
      return {viewport:view,pageWidth:root,overflow,inputs:[...document.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(visible).length};
    }""")
def check(page,screen,w,h):
    data=inspect(page)
    data.update(screen=screen,width=w,height=h)
    report.append(data)
    print(json.dumps(data,ensure_ascii=False),flush=True)
    page.screenshot(path=str(OUT/f"{screen}-{w}x{h}.png"),full_page=False)
    if data["pageWidth"]>data["viewport"]+3: failures.append(f"{screen} {w}x{h}: document horizontal overflow {data['pageWidth']}")
def open_page(context,path):
    page=context.new_page()
    page.set_default_timeout(6000)
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.goto(BASE+path,wait_until="domcontentloaded")
    page.locator("#root > *").first.wait_for(timeout=15000)
    page.wait_for_timeout(350)
    return page,errors
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for w,h in sizes:
        context=browser.new_context(viewport={"width":w,"height":h},has_touch=True,is_mobile=w<600,device_scale_factor=1,locale="nn-NO",color_scheme="dark",reduced_motion="reduce")
        context.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        for screen in ["flow","card","builder","pt","plan","select","acta"]:
            page=None
            try:
                page,errors=open_page(context,f"/ui-audit.html?scenario={'audit-pt-plan' if screen=='pt' else 'audit-admin' if screen=='builder' else 'audit-member'}&screen={screen}")
                check(page,screen,w,h)
                if screen=="flow":
                    field=page.get_by_role("textbox",name="Arbeidsvekt kg")
                    field.tap()
                    keypad=page.get_by_role("complementary",name="Garasjegym taltastatur")
                    keypad.wait_for()
                    for key in ["1","2",",","5"]: keypad.get_by_role("button",name=key,exact=True).tap()
                    assert field.input_value()=="12.5",field.input_value()
                    keypad.get_by_role("button",name="Neste talfelt").tap()
                    keypad.get_by_role("button",name="8",exact=True).tap()
                    assert page.get_by_role("textbox",name="Repetisjonar").input_value()=="8"
                    check(page,"flow-keypad",w,h)
                    keypad.get_by_role("button",name="Lukk taltastatur").tap()
                    page.get_by_role("button",name="Forkast økta").tap()
                    dialog=page.get_by_role("alertdialog")
                    dialog.wait_for()
                    box=dialog.bounding_box()
                    assert box["x"]>=-1 and box["x"]+box["width"]<=w+1
                    check(page,"flow-confirm",w,h)
                    dialog.get_by_role("button",name="Avbryt").tap()
                if screen=="card":
                    page.get_by_role("button",name="Dosering",exact=True).tap()
                    check(page,"card-dose",w,h)
                if screen=="builder":
                    page.get_by_role("button",name="Samansett økt",exact=False).first.tap()
                    page.get_by_role("navigation",name="Delar i WOD-en").wait_for()
                    check(page,"architect-overview",w,h)
                if screen=="pt":
                    card=page.locator(".pt-compact-session").first
                    card.wait_for()
                    assert page.get_by_role("button",name="Byt WOD",exact=True).count()==0
                    assert page.get_by_role("button",name="Flytt økt",exact=True).count()==0
                    assert card.bounding_box()["height"]<160,card.bounding_box()
                    card.get_by_role("button",name="Handlingar for",exact=False).tap()
                    menu=page.get_by_role("dialog",name="Øktmeny:",exact=False)
                    menu.get_by_role("button",name="Kopla til utført PT-økt").tap()
                    evidence=page.get_by_role("dialog",name="Kopla til utført PT-økt")
                    evidence.get_by_role("button",name="Mancave Paincave",exact=False).wait_for()
                    check(page,"pt-equivalent-picker",w,h)
                    evidence.get_by_role("button",name="Lukk",exact=True).tap()
                    card.get_by_role("button",name="Handlingar for",exact=False).tap()
                    menu.get_by_role("button",name="Flytt økt",exact=True).tap()
                    menu.get_by_role("button",name="Lagra plassering").wait_for()
                    check(page,"pt-move-sheet",w,h)
                    menu.get_by_role("button",name="Tilbake",exact=True).tap()
                    menu.get_by_role("button",name="Byt WOD",exact=True).tap()
                    picker=page.get_by_role("dialog",name="WOD til økta")
                    picker.wait_for()
                    box=picker.bounding_box()
                    assert box["x"]>=-1 and box["x"]+box["width"]<=w+1
                    check(page,"pt-wod-picker",w,h)
                    picker.get_by_role("button",name="Avbryt",exact=True).tap()
                    assert page.get_by_role("button",name="Byt WOD",exact=True).count()==0
                    card.get_by_role("button",name="Opna WOD").tap()
                    preview=page.get_by_role("dialog",name="WOD-kort:",exact=False)
                    preview.wait_for()
                    assert preview.get_by_role("button",name="Utfør WOD").count()==0
                    check(page,"pt-preview",w,h)
                    preview.get_by_role("button",name="Tilbake",exact=True).tap()
                    card.get_by_role("button",name="Handlingar for",exact=False).tap()
                    menu.get_by_role("button",name="Tilpass økt",exact=True).tap()
                    editor=page.get_by_role("dialog",name="Tilpass økt for",exact=False)
                    editor.get_by_role("navigation",name="Delar i WOD-en").wait_for(timeout=15000)
                    check(page,"architect-pt-edit",w,h)
                if screen=="acta":
                    panel=page.get_by_role("region",name="Treningsrapport per del")
                    assert panel.get_by_text("4 + 3",exact=True).is_visible()
                    assert panel.get_by_text("19",exact=True).is_visible()
                    assert panel.get_by_text("8",exact=True).is_visible()
                    check(page,"acta-report",w,h)
                    page.evaluate("window.dispatchEvent(new Event('gg:workout-back',{cancelable:true}))")
                    page.get_by_role("button",name="Opna rapport").wait_for()
                    home=page.get_by_role("button",name="Heim",exact=True)
                    if home.is_visible():
                        home.dispatch_event("pointerdown",{"button":0,"clientX":10,"clientY":10})
                        page.wait_for_timeout(650)
                        home.dispatch_event("pointerup")
                        home.dispatch_event("click")
                        assert page.get_by_role("dialog",name="Hurtigmeny").is_visible()
                        assert page.get_by_label("Vanlege trykk").inner_text()=="0"
                        check(page,"quick-menu-longpress",w,h)
                if screen=="select":
                    page.get_by_role("combobox",name="Testval").tap()
                    page.get_by_role("listbox").wait_for(timeout=10000)
                    check(page,"select-sheet",w,h)
                    page.get_by_role("listbox").get_by_role("option").nth(1).tap()
                    assert page.get_by_role("combobox",name="Testval").input_value()=="b"
                if errors: failures.append(f"{screen} {w}x{h}: JS {errors[:2]}")
            except Exception as e: failures.append(f"{screen} {w}x{h}: {e}")
            finally:
                if page: page.close()
        for screen in ["home","wod","group","pt","my-page","maintenance","help"]:
            page=None
            try:
                page,errors=open_page(context,"/video-demo.html?scenario="+("maintenance" if screen=="maintenance" else "home"))
                page.wait_for_function("Boolean(window.__ggVideo)")
                page.evaluate("(screen)=>window.__ggVideo.setScreen(screen)",screen)
                page.wait_for_timeout(350)
                check(page,"demo-"+screen,w,h)
                if screen=="wod":
                    tile=page.locator(".librarium-open").first
                    tile.wait_for()
                    grid=page.locator(".librarium-grid").first
                    columns=grid.evaluate("(el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length")
                    assert columns==(3 if w>h else 2),f"Unexpected column count: {columns}"
                    title=tile.locator(".librarium-name")
                    assert title.evaluate("(el)=>el.getBoundingClientRect().height<=32.5")
                    assert page.get_by_role("combobox",name="Kategori").count()==0
                    page.get_by_role("button",name="Vis fleire filter").tap()
                    assert page.get_by_role("combobox",name="Kategori").is_visible()
                    page.get_by_role("button",name="Vis fleire filter").tap()
                    page.locator(".librarium-more").first.tap()
                    menu=page.get_by_role("dialog",name="Handlingar for",exact=False)
                    menu.wait_for()
                    assert menu.get_by_role("button",name="Lukk",exact=True).is_visible()
                    check(page,"librarium-menu",w,h)
                    menu.get_by_role("button",name="Lukk",exact=True).tap()
                    page.get_by_role("combobox",name="Sorter WOD").select_option("name")
                    tile.tap()
                    card=page.get_by_role("dialog",name="WOD-kort:",exact=False)
                    card.wait_for()
                    check(page,"librarium-full-card",w,h)
                    card.get_by_role("button",name="Dosering",exact=True).tap()
                    check(page,"librarium-full-dose",w,h)
                    card.get_by_role("button",name="Tilbake",exact=True).tap()
                    tile.wait_for()
                    page.close()
                    page,errors=open_page(context,"/video-demo.html?scenario=audit-folders")
                    page.wait_for_function("Boolean(window.__ggVideo)")
                    page.evaluate("window.__ggVideo.setScreen('wod')")
                    page.get_by_role("button",name="Treningsplanar",exact=False).first.tap()
                    folders=page.get_by_role("region",name="Treningsplanmapper")
                    folders.wait_for()
                    assert folders.get_by_role("button",name="Ny treningsplan",exact=False).is_visible()
                    assert page.locator(".librarium-tile").count()==0
                    check(page,"plan-folders",w,h)
                    folders.get_by_role("button",name="Introkurs",exact=False).tap()
                    page.locator(".librarium-tile").first.wait_for()
                    assert page.locator(".librarium-name").all_text_contents()==["Z – Første økt","A – Andre økt"]
                    check(page,"plan-folder-open",w,h)
                    page.get_by_role("button",name="Tilbake til treningsplanar").tap()
                    folders.get_by_role("button",name="Ny treningsplan",exact=False).tap()
                    assert page.locator(".librarium-tile").count()==0
                    page.get_by_role("combobox",name="Samling").select_option("recent")
                    page.locator(".librarium-tile").first.wait_for()
                    assert page.locator(".librarium-name").all_text_contents()==["Stålsnakke · 12 min","Z – Første økt"]
                    check(page,"recent-personal-wods",w,h)
                if errors: failures.append(f"demo {screen} {w}x{h}: JS {errors[:2]}")
            except Exception as e: failures.append(f"demo {screen} {w}x{h}: {e}")
            finally:
                if page: page.close()
        context.close()
    browser.close()
(OUT/"report.json").write_text(json.dumps({"checks":report,"failures":failures},ensure_ascii=False,indent=2))
print("RESPONSIVE AUDIT:",len(report),"snapshots;",len(failures),"failures",flush=True)
for failure in failures: print("FAIL:",failure,flush=True)
if failures: sys.exit(1)
