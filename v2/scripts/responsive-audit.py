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
    # Explicit desktop companion test; synthetic catalogue, no production connection.
    for w,h in [(320,568),(390,844),(844,390),(1024,768),(1440,900),(1920,1080)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},accept_downloads=True,locale='nn-NO',timezone_id='Europe/Oslo')
        ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page=None
        try:
            page,errors=open_page(ctx,'/ui-audit.html?scenario=audit-admin&screen=werkstatt')
            page.get_by_role('heading',name='WERKSTATT',exact=True).wait_for()
            check(page,'werkstatt-home',w,h)
            page.get_by_role('button',name='WOD-eksport',exact=True).click()
            page.get_by_role('button',name='Vel viste',exact=False).click()
            page.get_by_role('button',name='CSV',exact=True).wait_for()
            assert page.get_by_role('button',name='CSV',exact=True).is_enabled()
            with page.expect_download() as dl:
                page.get_by_role('button',name='CSV',exact=True).click()
            assert dl.value.suggested_filename.endswith('.csv')
            check(page,'werkstatt-export',w,h)
            page.get_by_role('button',name='Planimport',exact=True).click()
            page.get_by_role('textbox',name='Planfilinnhald').fill('week;day;title;wod;minutes;kind\n1;1;Grunnstyrke;;45;training')
            page.get_by_role('button',name='Kontroller plan',exact=True).click()
            page.get_by_role('button',name='Lagra ny planmal',exact=True).wait_for()
            assert page.get_by_role('button',name='Lagra ny planmal',exact=True).is_disabled()
            page.get_by_role('checkbox',name='Eg har kontrollert',exact=False).check()
            assert page.get_by_role('button',name='Lagra ny planmal',exact=True).is_enabled()
            check(page,'werkstatt-plan-review',w,h)
            page.get_by_role('button',name='LIBRARIUM',exact=True).click()
            page.get_by_role('heading',name='LIBRARIUM · øvingsbank').wait_for()
            check(page,'werkstatt-librarium',w,h)
            page.get_by_role('button',name='EXPORTWERK',exact=True).click()
            page.get_by_role('heading',name='EXPORTWERK 49 · eigne treningsdata').wait_for()
            check(page,'werkstatt-exportwerk',w,h)
            page.get_by_role('button',name='Oppvarming',exact=True).click()
            page.get_by_role('button',name='Panzer Mobility',exact=False).wait_for()
            assert page.get_by_role('button',name='Blitz Herz',exact=False).is_visible()
            check(page,'werkstatt-warmups',w,h)
            assert not errors,errors
        except Exception as error:
            failures.append(f'werkstatt {w}x{h}: {error}')
        finally:
            if page:page.close()
            ctx.close()
    for w,h in sizes:
        context=browser.new_context(viewport={"width":w,"height":h},has_touch=True,is_mobile=w<600,device_scale_factor=1,locale="nn-NO",timezone_id="Europe/Oslo",color_scheme="dark",reduced_motion="reduce")
        context.route("**/*",lambda route:route.continue_() if route.request.url.startswith(BASE) else route.abort())
        for screen in ["flow","card","builder","pt","pt-workbench","pt-schedule","plan","select","acta","picker","assign","member-calendar"]:
            page=None
            try:
                page,errors=open_page(context,f"/ui-audit.html?scenario={'audit-member-calendar' if screen=='member-calendar' else 'audit-pt-schedule' if screen=='pt-schedule' else 'audit-pt-plan' if screen in ('pt','pt-workbench') else 'audit-admin' if screen in ('builder','assign') else 'audit-member'}&screen={'pt' if screen=='pt-schedule' else screen}")
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
                    page.get_by_role("button",name="Neste →",exact=True).tap()
                    page.get_by_role("button",name="Vidare til øvingar",exact=True).tap()
                    settings=page.get_by_role("dialog",name="Format og tid for øktdelen")
                    settings.wait_for()
                    settings.get_by_role("combobox",name="Format",exact=True).select_option("Chipper")
                    settings.get_by_role("button",name="15",exact=True).tap()
                    settings.get_by_role("button",name="Ferdig",exact=True).tap()
                    settings.wait_for(state="hidden")
                    parts=page.get_by_role("navigation",name="Delar i WOD-en")
                    parts.wait_for()
                    assert parts.locator(".gg-part-chip").count()==1
                    assert "Chipper" in parts.inner_text() and "15:00" in parts.inner_text()
                    check(page,"architect-overview",w,h)
                    page.get_by_role("button",name="WOD-handlingar",exact=True).tap()
                    page.get_by_role("button",name="Endra format",exact=True).tap()
                    page.get_by_role("button",name="AMRAP",exact=False).first.tap()
                    page.get_by_role("button",name="Neste →",exact=True).tap()
                    page.get_by_role("button",name="WOD-handlingar",exact=True).tap()
                    page.get_by_role("button",name="Samspel",exact=True).tap()
                    panel=page.get_by_role("region",name="Samspel")
                    panel.get_by_role("combobox",name="Samarbeidsmal").select_option("legacy")
                    panel.get_by_role("button",name="Fjern Samspel").wait_for()
                    assert panel.get_by_label("Byteregel").input_value()=="round"
                    panel.get_by_label("Tal utøvarar").select_option("4")
                    panel.get_by_role("checkbox",name="Separate arbeidsstasjonar",exact=False).check()
                    stations=panel.locator("fieldset")
                    assert stations.count()==2
                    stations.nth(1).get_by_label("Arbeidsoppgåve").select_option("bike")
                    stations.nth(1).get_by_label("Måleeining").select_option("calories")
                    panel.get_by_label("Tilgjengeleg · Romaskin",exact=True).fill("1")
                    panel.get_by_label("Tilgjengeleg · Sykkel",exact=True).fill("1")
                    check(page,"architect-samspel",w,h)
                if screen=="picker":
                    picker=page.locator(".wod-picker")
                    rows=picker.locator(".wod-picker-option")
                    assert rows.count()==3
                    assert not rows.evaluate_all("""rows=>rows.flatMap((row,i)=>{
                      const box=row.getBoundingClientRect(), main=row.querySelector('.wod-picker-option-main').getBoundingClientRect(), next=rows[i+1]?.getBoundingClientRect();
                      return main.bottom>box.bottom+1||main.top<box.top-1||next&&box.bottom>next.top+1?[row.textContent]:[]
                    })""")
                    rows.nth(1).tap()
                    assert rows.nth(1).get_attribute("aria-pressed")=="true"
                    picker.get_by_role("button",name="Filter",exact=False).tap()
                    assert picker.get_by_role("combobox",name="Filtrer på WOD-format").is_visible()
                    check(page,"picker-expanded",w,h)
                if screen=="assign":
                    page.get_by_role("button",name="Tildel WOD",exact=True).tap()
                    sheet=page.get_by_role("dialog",name="Tildel WOD til",exact=False)
                    sheet.wait_for()
                    row=sheet.locator(".pt-wod-library-list > button").first
                    row.wait_for(timeout=15000)
                    assert sheet.locator(".wod-builder-heading").count()==0
                    assign=sheet.get_by_role("button",name="Tildel vald WOD til kunden")
                    assert assign.is_disabled()
                    row.tap()
                    assert assign.is_enabled()
                    check(page,"pt-assign-selected",w,h)
                    sheet.get_by_role("button",name="Lukk tildeling").tap()
                    assert sheet.count()==0
                if screen=="pt-workbench":
                    bench=page.get_by_role("region",name="Kva vil du gjera med kunden?")
                    bench.wait_for(timeout=15000)
                    bench.get_by_role("button",name="Tildel WOD",exact=True).tap()
                    assign=page.get_by_role("dialog",name="Tildel WOD til",exact=False)
                    assign.wait_for()
                    assert "Demomedlem" in assign.inner_text()
                    check(page,"pt-workbench-assign",w,h)
                    assign.get_by_role("button",name="Lukk tildeling").tap()
                    assert assign.count()==0
                    bench.get_by_role("button",name="Jobb med treningsplan",exact=True).tap()
                    page.locator(".pt-compact-plan").wait_for()
                    page.get_by_role("button",name="Arbeidsflate",exact=True).tap()
                    bench.wait_for()
                    assert assign.count()==0
                    check(page,"pt-workbench-return",w,h)
                if screen=="member-calendar":
                    calendar=page.get_by_role("region",name="Min timeplan")
                    calendar.wait_for()
                    agenda=calendar.locator(".gg-cal-agenda")
                    # Match the exact event heading, not explanatory text in other cards.
                    ready=agenda.locator("article").filter(has=page.locator("strong").and_(page.get_by_text("Klar programøkt",exact=True)))
                    locked=agenda.locator("article").filter(has=page.locator("strong").and_(page.get_by_text("Låst programøkt",exact=True)))
                    direct=agenda.locator("article").filter(has=page.locator("strong").and_(page.get_by_text("Tildelt kalender-WOD",exact=True)))
                    ready.wait_for()
                    locked.wait_for()
                    direct.wait_for()
                    assert ready.count()==locked.count()==direct.count()==1
                    assert "17:15" in ready.inner_text()
                    assert "18:30" in locked.inner_text()
                    assert "16:30" in direct.inner_text()
                    assert locked.get_by_role("button").count()==0
                    assert ready.get_by_role("button",name="Start økt").is_visible()
                    check(page,"member-calendar-ready-locked",w,h)
                    page.evaluate("sessionStorage.setItem('gg.audit.calendar.deny','1')")
                    ready.get_by_role("button",name="Start økt").tap()
                    calendar.get_by_role("alert").wait_for()
                    assert page.get_by_label("Startkontekst").inner_text()==""
                    page.evaluate("sessionStorage.removeItem('gg.audit.calendar.deny')")
                    ready.get_by_role("button",name="Start økt").tap()
                    page.wait_for_function("document.querySelector('output[aria-label=Startkontekst]')?.textContent==='program:calendar-plan-1:demo-wod'")
                    direct.get_by_role("button",name="Opne WOD").tap()
                    assert page.get_by_label("Startkontekst").inner_text()=="assignment:calendar-assignment:demo-wod"
                    assert page.evaluate("JSON.parse(sessionStorage.getItem('gg.audit.calendar.rpc'))")==["calendar-plan-1","calendar-plan-1"]
                    check(page,"member-calendar-launch",w,h)
                if screen=="pt-schedule":
                    calendar=page.get_by_role("region",name="Treningskalender")
                    calendar.wait_for()
                    today=calendar.locator(".gg-schedule-day.today")
                    date=today.get_by_role("button",name="Legg til økt",exact=False).get_attribute("aria-label").split()[-1]
                    today.get_by_role("button",name="Legg til økt",exact=False).tap()
                    dialog=page.get_by_role("dialog",name="Tildel WOD til",exact=False)
                    # Actual schedule dialog with app bottom navigation present.
                    assert dialog.evaluate("e=>e.parentElement.parentElement===document.body")
                    rows=dialog.locator(".wod-picker-option")
                    rows.first.wait_for()
                    assert not rows.evaluate_all("""rows=>rows.flatMap((row,i)=>{
                      const box=row.getBoundingClientRect(), main=row.querySelector('.wod-picker-option-main').getBoundingClientRect(), next=rows[i+1]?.getBoundingClientRect();
                      return main.bottom>box.bottom+1||main.top<box.top-1||next&&box.bottom>next.top+1?[row.textContent]:[]
                    })""")
                    assert dialog.get_by_role("button",name="Bruk val (0)",exact=True).is_disabled()
                    rows.first.tap()
                    action=dialog.get_by_role("button",name="Bruk val (1)",exact=True)
                    action.scroll_into_view_if_needed()
                    assert action.evaluate("""e=>{const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return y>=0&&y<innerHeight&&e.contains(document.elementFromPoint(x,y))}""")
                    check(page,"pt-schedule-picker-selected",w,h)
                    action.tap()
                    assert dialog.get_by_label("Tildelingstype").input_value()=="plan"
                    assert dialog.locator('input[type=date]').input_value()==date
                    dialog.locator('input[type=time]').fill("17:15")
                    check(page,"pt-schedule-confirm",w,h)
                    dialog.get_by_role("button",name="Stadfest tildeling").tap()
                    dialog.wait_for(state="hidden",timeout=10000)
                    card=today.locator(".gg-schedule-plan")
                    card.wait_for(timeout=10000)
                    assert "17:15" in card.inner_text()
                    check(page,"pt-schedule-saved",w,h)
                    card.get_by_role("button",name="Flytt",exact=False).tap()
                    move=page.get_by_role("dialog",name="Flytt planøkt")
                    move.locator('input[type=time]').fill("18:30")
                    move.get_by_role("button",name="Lagre tidspunkt").tap()
                    move.wait_for(state="hidden",timeout=10000)
                    page.wait_for_function("document.querySelector('.gg-schedule-day.today .gg-schedule-plan')?.innerText.includes('18:30')")
                    assert today.locator(".gg-schedule-plan").count()==1
                    check(page,"pt-schedule-moved",w,h)
                    today.get_by_role("button",name="Legg til økt",exact=False).tap()
                    dialog.locator(".wod-picker-option").first.tap()
                    dialog.get_by_role("button",name="Bruk val (1)",exact=True).tap()
                    dialog.get_by_label("Tildelingstype").select_option("deadline")
                    dialog.get_by_role("button",name="Stadfest tildeling").tap()
                    dialog.wait_for(state="hidden",timeout=10000)
                    today.locator(".gg-schedule-assignment").wait_for(timeout=10000)
                    assert today.locator(".gg-schedule-plan").count()==1
                    assert "Frist" in today.locator(".gg-schedule-assignment").inner_text()
                    check(page,"pt-schedule-direct",w,h)
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
                    # A document-width check alone misses text spilling between rows.
                    rows=picker.locator(".wod-picker-option")
                    assert rows.count()>0
                    overlaps=rows.evaluate_all("""rows => rows.flatMap((row,i)=>{
                      const box=row.getBoundingClientRect(),main=row.querySelector('.wod-picker-option-main')?.getBoundingClientRect(),next=rows[i+1]?.getBoundingClientRect();
                      return (main&&(main.bottom>box.bottom+1||main.top<box.top-1)||next&&box.bottom>next.top+1)?[row.textContent.trim().slice(0,80)]:[]
                    })""")
                    assert not overlaps,overlaps
                    picker.get_by_role("button",name="Filter",exact=False).tap()
                    assert picker.get_by_role("combobox",name="Filtrer på WOD-format").is_visible()
                    picker.get_by_role("button",name="Filter",exact=False).tap()
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
                    assert editor.get_by_role("textbox",name="WOD-namn",exact=True).first.input_value().startswith("Stålsnakke")
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
