# Browser smoke test: loads the game from file://, plays through the UI, captures screenshots and console errors.
import sys, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT + '/01-menu.png')
    pg.click('text=New Game'); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/02-newgame.png')
    pg.fill('input[data-in="ng:name"]', 'Testburg'); pg.fill('#ng-seed', '4242')
    pg.click('text=Found city'); pg.wait_for_timeout(1500); pg.screenshot(path=OUT + '/03-start.png')
    # build through the real UI: road tool drag
    pg.keyboard.press('1'); pg.wait_for_timeout(200); pg.click('.card >> nth=1'); pg.wait_for_timeout(200)
    pg.mouse.move(600, 450); pg.mouse.down(); pg.mouse.move(1000, 650, steps=8); pg.wait_for_timeout(200); pg.screenshot(path=OUT + '/04-road-drag.png'); pg.mouse.up(); pg.wait_for_timeout(300)
    roads = pg.evaluate('M.world.roadTiles'); print('road tiles after UI drag:', roads)
    # scripted town via the same construction API the UI uses
    pg.evaluate('''() => { const W=M.world,B=M.Build,sx=W.start.x,sy=W.start.y;
      const road=(t,a,b,c,d)=>{const k=B.checkRoad(t,B.linePath(a,b,c,d)); if(k.ok) B.applyRoad(t,k);};
      for(let k=-2;k<=2;k++){road(2,sx-14,sy+k*5,sx+14,sy+k*5);road(2,sx+k*7,sy-10,sx+k*7,sy+10);}
      road(3,sx-14,sy,sx+14,sy);
      const zone=(z,d,a,b,c,e)=>{const k=B.checkZone(z,d,B.rect(a,b,c,e));B.applyZone(z,d,k);};
      zone(1,1,sx-13,sy-9,sx+2,sy+9);zone(2,1,sx+3,sy-9,sx+8,sy+9);zone(3,1,sx+9,sy-9,sx+14,sy+9);
      const put=(id,x,y)=>{for(let r=0;r<10;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){const k=B.checkBuild(id,x+ox,y+oy);if(k.ok&&W.findRoad(x+ox,y+oy,M.DEFS[id].size,1)>=0)return B.applyBuild(id,k,0);}};
      put('coal',sx+16,sy-12);put('wind',sx-15,sy-10);put('wtower',sx-15,sy+10);put('wtower',sx-15,sy+5);put('park',sx-3,sy-3);
      M.Camera.centerOn(sx,sy,true); }''')
    pg.wait_for_timeout(600); pg.screenshot(path=OUT + '/05-laid-out.png')
    def run(days): pg.evaluate('(d) => { for (let i=0;i<d;i++){ M.Engine.tickDay(); M.Traffic.update(0.5,M.world,M.city,M.Render.view);} }', days)
    run(400); pg.wait_for_timeout(800); pg.screenshot(path=OUT + '/06-year1.png')
    pg.evaluate('''() => { const W=M.world,B=M.Build,sx=W.start.x,sy=W.start.y; M.city.money+=200000;
      const put=(id,x,y)=>{const s=M.DEFS[id].size,r0=B.rect(x,y,x+s-1,y+s-1);let rd=false;for(let yy=y;yy<y+s;yy++)for(let xx=x;xx<x+s;xx++)if(W.road[W.idx(xx,yy)])rd=true;if(!rd){const c0=B.checkBulldoze(r0);if(c0.n)B.applyBulldoze(r0,c0);}const k=B.checkBuild(id,x,y);if(k.ok)return B.applyBuild(id,k,0);};
      put('landfill',sx+16,sy+8);put('fire',sx-4,sy+1);put('police',sx+1,sy-4);put('clinic',sx-8,sy-4);put('elem',sx-9,sy+1);put('plaza',sx+4,sy+1);put('bigpark',sx-6,sy-9);put('high',sx-5,sy+6);
      const zone=(z,d,a,b,c,e)=>{const k=B.checkZone(z,d,B.rect(a,b,c,e));B.applyZone(z,d,k);};
      M.city.tier=Math.max(M.city.tier,3); zone(1,3,sx-13,sy-9,sx+2,sy+9);zone(2,3,sx+3,sy-9,sx+8,sy+9);zone(3,3,sx+9,sy-9,sx+14,sy+9); }''')
    run(1500); pg.wait_for_timeout(800); pg.screenshot(path=OUT + '/07-year5.png')
    pg.evaluate('() => { M.city.tod = 0.92; }'); pg.wait_for_timeout(700); pg.screenshot(path=OUT + '/08-night.png')
    pg.evaluate('() => { M.city.tod = 0.4; M.city.weather.type="rain"; M.city.weather.days=20; M.Camera.tz=1.7; }'); pg.wait_for_timeout(900); pg.screenshot(path=OUT + '/09-zoom-rain.png')
    pg.evaluate('() => { M.city.weather.type="clear"; M.Camera.tz=0.45; }'); pg.wait_for_timeout(900); pg.screenshot(path=OUT + '/10-zoomout.png')
    pg.evaluate('() => { M.Camera.tz=1; }'); pg.wait_for_timeout(500)
    for i, pid in enumerate(['budget', 'pop', 'policy', 'traffic', 'utility', 'advisor', 'milestone', 'stats']):
        pg.evaluate('(id) => M.UI.openPanel(id)', pid); pg.wait_for_timeout(350); pg.screenshot(path=OUT + '/11-panel-%s.png' % pid)
    pg.evaluate('() => { M.UI.closePanel(); M.UI.setOverlay("lv"); }'); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/12-overlay-lv.png')
    pg.evaluate('() => { M.UI.setOverlay("traffic"); }'); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/13-overlay-traffic.png')
    pg.evaluate('() => { M.UI.setOverlay(null); const b = M.world.blds.find(b => b && b.z===1 && b.lvl>=2); M.UI.inspect(b); M.Camera.centerOn(b.x,b.y,true); }'); pg.wait_for_timeout(400); pg.screenshot(path=OUT + '/14-inspect.png')
    pg.keyboard.press('Escape'); pg.keyboard.press('7'); pg.wait_for_timeout(300); pg.click('.card >> nth=3'); pg.mouse.move(800, 420); pg.wait_for_timeout(300); pg.screenshot(path=OUT + '/15-place-preview.png')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # save / load through the real IndexedDB path
    res = pg.evaluate('''async () => { const pop=M.city.pop, cnt=M.world.count, day=M.city.day; const ok = await M.Save.save('test-slot','Test save'); const list = await M.Save.list();
      M.Engine.newGame({name:'Other',seed:1,size:64}); const ok2 = await M.Save.load('test-slot'); return {persistent:M.Save.persistent, ok, n:list.length, ok2, samePop: M.city.pop===pop, sameCnt: M.world.count===cnt, sameDay: M.city.day===day, name:M.city.name}; }''')
    print('save/load:', json.dumps(res))
    pg.evaluate('() => M.Menu.enterGame()'); pg.wait_for_timeout(500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); pg.screenshot(path=OUT + '/16-pause.png')
    pg.click('#modal >> text=Options'); pg.wait_for_timeout(300); pg.screenshot(path=OUT + '/17-options.png')
    perf = pg.evaluate('() => ({fps: Math.round(M.Engine.fps), sim: M.Engine.simMs, items: M.Render.stats.items, cars: M.Traffic.cars.length, peds: M.Traffic.peds.length, pop: M.city.pop, tier: M.city.tier, blds: M.world.count})'); print('state:', json.dumps(perf))
    t = pg.evaluate('''() => { const t0=performance.now(); for(let i=0;i<60;i++) M.Render.draw(0.016,0.016); return (performance.now()-t0)/60; }'''); print('render ms/frame: %.2f' % t)
    b.close()
print('ERRORS (%d):' % len(errors)); [print('  ', e) for e in errors[:25]]
