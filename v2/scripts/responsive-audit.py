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
        for screen in ["flow","card","builder","pt","plan","select"]:
            page=None
            try:
                page,errors=open_page(context,f"/ui-audit.html?scenario={'audit-admin' if screen in ['builder','pt'] else 'audit-member'}&screen={screen}")
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
                if screen=="select":
                    page.get_by_role("combobox",name="Testval").tap()
                    page.get_by_role("listbox").wait_for(timeout=4000)
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
