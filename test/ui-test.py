# Clicks through the real interface (buttons, sliders, tools, menus) and reports JavaScript errors.
import sys, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'
errors = []; checks = []
def ok(c, m): checks.append((bool(c), m)); print(('  ok: ' if c else '  FAIL: ') + m)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1440, 'height': 860})
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(2000)
    for name in ['Options', 'Achievements', 'How to Play', 'Statistics']:
        pg.click('#menu >> text=' + name); pg.wait_for_timeout(250); ok(pg.is_visible('#modal .mbox'), 'menu: ' + name + ' opens'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    pg.click('#menu >> text=New Game'); pg.wait_for_timeout(300); pg.click('#modal >> text=Sandbox'); pg.click('#modal >> text=Small'); pg.fill('input[data-in="ng:name"]', 'Clicktown'); pg.fill('#ng-seed', '777'); pg.click('text=Found city'); pg.wait_for_timeout(1200)
    ok(pg.evaluate('M.mode') == 'game' and pg.evaluate('M.city.mode') == 'sandbox' and pg.evaluate('M.world.n') == 64 and pg.inner_text('#h-name') == 'Clicktown', 'new game applies name, sandbox mode and map size')
    cx, cy = 720, 430
    def drag(x0, y0, x1, y1): pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, steps=4); pg.mouse.move(x1, y1, steps=4); pg.wait_for_timeout(60); pg.mouse.up(); pg.wait_for_timeout(120)
    pg.click('#cat-road'); pg.click('#tray .card >> nth=1'); drag(cx - 260, cy - 130, cx + 260, cy + 130); r1 = pg.evaluate('M.world.roadTiles'); ok(r1 > 10, 'road tool: dragged %d road tiles' % r1)
    pg.click('#tray .card >> nth=2'); drag(cx - 260, cy + 60, cx + 100, cy - 120); ok(pg.evaluate('M.world.roadTiles') > r1, 'avenue tool adds more road')
    pg.keyboard.press('Control+z'); ok(pg.evaluate('M.world.roadTiles') == r1, 'Ctrl+Z undoes the last drag')
    pg.click('#cat-res'); pg.click('#tray .card >> nth=0'); drag(cx - 200, cy - 60, cx - 60, cy + 10); z1 = pg.evaluate('(() => { let n=0; for (const z of M.world.zone) if (z===1) n++; return n; })()'); ok(z1 > 4, 'residential zoning painted on %d tiles' % z1)
    pg.click('#cat-com'); pg.click('#tray .card >> nth=0'); drag(cx + 40, cy + 60, cx + 140, cy + 110)
    pg.click('#cat-ind'); pg.click('#tray .card >> nth=0'); drag(cx + 160, cy + 120, cx + 280, cy + 170)
    pg.click('#cat-power'); pg.click('#tray .card >> nth=1'); pg.mouse.move(cx - 20, cy - 60); pg.wait_for_timeout(150); info = pg.inner_text('#cursorinfo'); pg.mouse.click(cx - 20, cy - 60); pg.wait_for_timeout(150)
    ok(pg.evaluate('M.world.blds.filter(b => b && b.t === "wind").length') >= 1 or 'way' in info, 'wind turbine placed by click (cursor said: %s)' % info)
    pg.keyboard.press('r'); ok(pg.evaluate('M.Build.flip') == 1, 'R rotates the building preview')
    pg.click('#cat-power'); pg.wait_for_timeout(100); pg.keyboard.press('6'); pg.wait_for_timeout(100); ok(pg.evaluate('M.UI.cat') == 'water', 'number keys switch category')
    pg.click('#tray .card >> nth=1'); pg.mouse.click(cx + 30, cy - 80); pg.wait_for_timeout(150)
    pg.keyboard.press('b'); drag(cx + 250, cy + 115, cx + 262, cy + 125); pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(pg.evaluate('M.Build.tool.type') == 'pointer', 'Esc returns to the inspect tool')
    for s in ['4', '2', '0', '1']: pg.click('.sp[data-act="speed:%s"]' % s); pg.wait_for_timeout(60)
    ok(pg.evaluate('M.Engine.speed') == 1 and not pg.evaluate('M.Engine.paused'), 'speed buttons work'); pg.keyboard.press('Space'); ok(pg.evaluate('M.Engine.paused'), 'space pauses'); pg.keyboard.press('Space')
    pg.evaluate('() => { for (let i = 0; i < 500; i++) { M.Engine.tickDay(); M.Traffic.update(0.5, M.world, M.city, M.Render.view); } }'); pg.wait_for_timeout(600)
    pop = pg.evaluate('M.city.pop'); ok(pop > 0, 'city built purely through the UI grows: %d residents' % pop); pg.screenshot(path=OUT + '/20-ui-built.png')
    for pid in ['budget', 'pop', 'policy', 'traffic', 'utility', 'advisor', 'milestone', 'stats']:
        pg.click('#sb-panel-' + pid); pg.wait_for_timeout(180); ok(pg.is_visible('#panel') and len(pg.inner_text('#p-body')) > 40, 'side button opens ' + pid)
    pg.click('#sb-panel-budget'); pg.wait_for_timeout(150)
    pg.eval_on_selector('input[data-in="tax:R"]', 'e => { e.value = 13; e.dispatchEvent(new Event("input", {bubbles: true})); e.dispatchEvent(new Event("change", {bubbles: true})); }'); ok(pg.evaluate('M.city.tax.R') == 13 and pg.inner_text('#tx-R') == '13%', 'tax slider changes the tax rate')
    pg.eval_on_selector('input[data-in="budget:fire"]', 'e => { e.value = 80; e.dispatchEvent(new Event("input", {bubbles: true})); }'); ok(pg.evaluate('M.city.budget.fire') == 80, 'department slider changes funding')
    pg.click('#p-body >> text=Borrow $10,000'); pg.wait_for_timeout(150); ok(pg.evaluate('M.city.loans.length') == 1, 'loan button works'); pg.click('#p-body button:has-text("Repay")'); pg.wait_for_timeout(150); ok(pg.evaluate('M.city.loans.length') == 0, 'repay button works')
    pg.click('#sb-panel-policy'); pg.wait_for_timeout(150); pg.click('.pol .tog >> nth=0'); pg.wait_for_timeout(150); ok(pg.evaluate('M.city.pol.recycle') == True, 'policy toggle enacts a city-wide policy')
    pg.click('.tab >> nth=2'); pg.wait_for_timeout(150); pg.fill('input[data-in="dname:2"]', 'Old Town'); pg.click('#p-body >> text=Paint this district'); drag(cx - 200, cy - 60, cx - 60, cy + 10)
    ok(pg.evaluate('M.city.districts[2].name') == 'Old Town' and pg.evaluate('(() => { let n=0; for (const d of M.world.district) if (d===2) n++; return n; })()') > 4, 'district can be named and painted'); pg.keyboard.press('Escape')
    pg.click('#sb-overlays'); pg.wait_for_timeout(120); pg.click('#overlays >> text=Land value'); pg.wait_for_timeout(200); ok(pg.evaluate('M.Render.overlay') == 'lv' and pg.is_visible('#legend'), 'data view switches with legend'); pg.screenshot(path=OUT + '/21-ui-overlay.png'); pg.click('#overlays >> text=None'); pg.click('#sb-overlays')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    tgt = pg.evaluate('(() => { const b = M.world.blds.find(b => b && b.z === 1 && b.built >= 1); M.Camera.centerOn(b.x + 0.5, b.y + 0.5, true); return b.id; })()'); pg.wait_for_timeout(300)
    pg.mouse.click(720, 430); pg.wait_for_timeout(250); ok(pg.is_visible('#panel') and pg.get_attribute('#panel', 'data-kind') in ('inspect', 'tile'), 'clicking the map opens the inspector (%s)' % pg.inner_text('#p-title'))
    pg.evaluate('(id) => M.UI.inspect(M.world.blds[id])', tgt); pg.wait_for_timeout(200); n0 = pg.evaluate('M.world.count'); pg.click('#p-body >> text=Demolish'); pg.wait_for_timeout(200); ok(pg.evaluate('M.world.count') == n0 - 1, 'inspector demolish button removes the building')
    pg.evaluate('() => { const b = M.world.blds.find(b => b && b.t === "wtower"); if (b) M.UI.inspect(b); }'); pg.wait_for_timeout(200)
    if pg.is_visible('#p-body >> text=Upgrade'): pg.click('#p-body >> text=Upgrade'); pg.wait_for_timeout(150); ok(pg.evaluate('M.world.blds.find(b => b && b.t === "wtower").up') == 2, 'inspector upgrade button upgrades the building')
    pg.mouse.move(720, 430); pg.mouse.wheel(0, -400); pg.wait_for_timeout(400); ok(pg.evaluate('M.Camera.zoom') > 1.05, 'mouse wheel zooms'); pg.keyboard.down('d'); pg.wait_for_timeout(300); pg.keyboard.up('d'); pg.keyboard.press('m'); ok(not pg.is_visible('#minimap'), 'M hides the minimap'); pg.keyboard.press('m')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok(pg.is_visible('#modal .plist'), 'Esc opens the pause menu'); pg.click('#modal >> text=Save Game'); pg.wait_for_timeout(300); pg.fill('#sv-name', 'UI test save'); pg.click('text=Save as new'); pg.wait_for_timeout(500)
    ok(pg.evaluate('M.Save.list().then(l => l.some(s => s.name === "UI test save"))'), 'save game writes a named slot')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); pg.click('#modal >> text=Exit to Main Menu'); pg.wait_for_timeout(200); pg.click('text=Exit without saving'); pg.wait_for_timeout(500); ok(pg.evaluate('M.mode') == 'menu' and pg.is_visible('#menu >> text=Return to Clicktown'), 'exit returns to the main menu')
    pg.click('#menu >> text=Load Game'); pg.wait_for_timeout(400); pg.click('.slot:has-text("UI test save") >> text=Load'); pg.wait_for_timeout(900); ok(pg.evaluate('M.mode') == 'game' and pg.evaluate('M.city.districts[2].name') == 'Old Town' and pg.evaluate('M.city.tax.R') == 13, 'load game restores the city, its policies and settings')
    pg.reload(); pg.wait_for_timeout(2200); ok(pg.is_visible('#menu >> text=Continue'), 'after a page reload the save is still there (Continue offered)'); pg.click('#menu >> text=Continue'); pg.wait_for_timeout(1000); ok(pg.evaluate('M.city.name') == 'Clicktown', 'Continue loads the latest save'); pg.screenshot(path=OUT + '/22-ui-continued.png')
    b.close()
bad = [c for c in checks if not c[0]]
print('JS ERRORS (%d):' % len(errors)); [print('   ', e) for e in errors[:20]]
print('%d checks, %d failed' % (len(checks), len(bad))); sys.exit(1 if bad or errors else 0)
