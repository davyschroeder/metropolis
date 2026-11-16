# Plays the tutorial like a new player: only clicks the highlighted element and drags over the highlighted map area.
import sys, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/play'
VW, VH = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1366, 768)
errors = []; report = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': VW, 'height': VH})
    pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(2000)
    pg.click('#menu >> text=Tutorial'); pg.wait_for_timeout(1200)
    step = lambda: pg.evaluate('M.Tutorial.active ? M.Tutorial.step : -1')
    title = lambda: pg.inner_text('#tut .ttl') if pg.is_visible('#tut') else ''
    def tile_xy(tx, ty):  # screen position of a tile centre
        return pg.evaluate('([x,y]) => { const W=M.world, e=W.eh(W.idx(x,y)), w=M.Camera.tileToWorld(x+0.5,y+0.5,e); return M.Camera.toScreen(w[0],w[1]); }', [tx, ty])
    def ring_center():
        r = pg.evaluate('(() => { const e=document.getElementById("tut-ring"); if (!e || e.classList.contains("hidden")) return null; const b=e.getBoundingClientRect(); return [b.left+b.width/2, b.top+b.height/2, b.width, b.height]; })()')
        return r
    def maprect(): return pg.evaluate('M.Tutorial.mapRect()')
    def settle(): pg.wait_for_timeout(900)  # camera glide
    def drag(a, b):
        pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move((a[0]+b[0])/2, (a[1]+b[1])/2, steps=5); pg.mouse.move(*b, steps=5); pg.wait_for_timeout(100); pg.mouse.up(); pg.wait_for_timeout(300)
    t0 = time.time(); last = -2; stuck = 0; actions = 0
    while step() >= 0 and actions < 60:
        s = step(); ttl = title()
        if s == last: stuck += 1
        else: stuck = 0; pg.screenshot(path=OUT + '/t%02d.png' % s); report.append((s, ttl, ring_center() is not None, maprect()))
        if stuck > 3: report.append(('STUCK', s, ttl, pg.inner_text('#tut'))); break
        last = s; actions += 1
        if pg.is_visible('#tut button[data-act="tut-next"]'): pg.click('#tut button[data-act="tut-next"]'); pg.wait_for_timeout(400); continue
        if s == 1: pg.mouse.move(VW/2, VH/2); pg.mouse.wheel(0, -300); pg.wait_for_timeout(500); drag((VW/2, VH/2), (VW/2 - 180, VH/2 - 60)); continue
        rc = ring_center(); mr = maprect()
        if ttl in ('Build a street',):
            settle(); mr = maprect(); drag(tile_xy(mr['x0'], mr['y0']), tile_xy(mr['x1'], mr['y1'])); continue
        if ttl in ('Zone homes', 'Generate electricity', 'Supply water', 'Jobs and shops'):
            if ttl == 'Jobs and shops':
                for cat, key in (('#cat-com', 'com'), ('#cat-ind', 'ind')):
                    pg.click(cat); settle(); r = pg.evaluate('M.Tutorial.plan.' + key); drag(tile_xy(r['x0'], r['y0']), tile_xy(r['x1'], r['y1']))
                continue
            if not rc: pg.wait_for_timeout(400); rc = ring_center(); print("NO RING at", ttl, pg.evaluate("({ring:document.getElementById(\"tut-ring\").className, modal:M.UI.modalOpen, step:M.Tutorial.step, tip:document.getElementById(\"tut\").innerText.slice(0,40)})"))
            pg.mouse.click(rc[0], rc[1]); pg.wait_for_timeout(300); settle(); mr = maprect()
            if ttl == 'Zone homes': drag(tile_xy(mr['x0'], mr['y0']), tile_xy(mr['x1'], mr['y1'])); continue
            name = 'Wind Turbine' if ttl == 'Generate electricity' else 'Water Tower'
            pg.click('#tray .card:has-text("%s")' % name); pg.wait_for_timeout(200); xy = tile_xy(mr['x0'], mr['y0']); pg.mouse.move(*xy); pg.wait_for_timeout(200)
            report.append(('  cursor', pg.inner_text('#cursorinfo'))); pg.mouse.click(*xy); pg.wait_for_timeout(400); pg.keyboard.press('Escape'); continue
        if ttl == 'Speed up time': pg.click('.sp[data-act="speed:4"]'); pg.wait_for_timeout(6000); continue
        if ttl == 'Inspect a building':
            hx = pg.evaluate('(() => { const b = M.world.blds.find(b => b && b.z === 1 && b.built >= 1); return b ? [b.x, b.y] : null; })()')
            pg.mouse.click(rc[0], rc[1]); xy = tile_xy(*hx); pg.mouse.click(xy[0], xy[1] - 6); pg.wait_for_timeout(400); continue
        if rc: pg.mouse.click(rc[0], rc[1]); pg.wait_for_timeout(400)
        if ttl == 'See the city’s data': pg.click('#overlays >> text=Land value'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT + '/t-end.png')
    fin = pg.evaluate('({active: M.Tutorial.active, tut: M.city.tut, pop: M.city.pop, money: Math.round(M.city.money), day: M.city.day, goalsVisible: !document.getElementById("goals").classList.contains("hidden")})')
    b.close()
for r in report: print(r)
print('final', json.dumps(fin), 'in %.0fs' % (time.time() - t0)); print('errors', errors)
