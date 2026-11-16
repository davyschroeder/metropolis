# Tutorial edge cases: close, resume from pause menu, save/load mid-tutorial, back button, new-game checkbox.
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); checks = []; errors = []
def ok(c, m): checks.append(bool(c)); print(('  ok: ' if c else '  FAIL: ') + m)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1366, 'height': 768}); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(1800)
    pg.click('#menu >> text=New Game'); pg.wait_for_timeout(300)
    ok(pg.is_checked('input[data-in="ng:tutorial"]'), 'first new game offers the tutorial (checked)')
    pg.click('text=Found city'); pg.wait_for_timeout(800); ok(pg.evaluate('M.Tutorial.active') and pg.is_visible('#tut'), 'tutorial starts with the new city')
    ok(not pg.is_visible('#goals'), 'goals list is hidden while the tutorial runs')
    pg.click('#tut button[data-act="tut-next"]'); pg.wait_for_timeout(300); pg.click('#tut button[data-act="tut-back"]'); pg.wait_for_timeout(300); ok(pg.evaluate('M.Tutorial.step') == 0, 'Back returns to the previous step')
    pg.evaluate('M.Tutorial.go(4)'); pg.wait_for_timeout(300)
    pg.evaluate('M.Save.save("tut-slot","mid tutorial")'); pg.wait_for_timeout(400)
    pg.click('#tut button[data-act="tut-skip"]'); pg.wait_for_timeout(200); pg.click('#modal >> text=Close tutorial'); pg.wait_for_timeout(300)
    ok(not pg.evaluate('M.Tutorial.active') and not pg.is_visible('#tut') and pg.is_visible('#goals'), 'closing hides the card and brings back the goals')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); txt = pg.inner_text('#modal'); ok('Resume Tutorial' in txt, 'pause menu offers "Resume Tutorial"')
    pg.click('#modal >> text=Resume Tutorial'); pg.wait_for_timeout(400); ok(pg.evaluate('M.Tutorial.active && M.Tutorial.step') == 4 and not pg.evaluate('M.UI.modalOpen'), 'resume continues at the same step')
    pg.evaluate('M.Engine.newGame({name:"X",seed:3,size:64})'); pg.wait_for_timeout(200); ok(not pg.evaluate('M.Tutorial.active'), 'starting another city without tutorial stops it')
    pg.evaluate('M.Save.load("tut-slot")'); pg.wait_for_timeout(600); ok(pg.evaluate('M.Tutorial.active && M.Tutorial.step') == 4, 'loading a save made mid-tutorial resumes the tutorial')
    pg.evaluate('M.Tutorial.go(13)'); pg.wait_for_timeout(200); pg.click('#tut button[data-act="tut-next"]'); pg.wait_for_timeout(300)
    ok(not pg.evaluate('M.Tutorial.active') and pg.evaluate('M.settings.tutDone'), 'finishing marks the tutorial done')
    pg.evaluate('M.Menu.show()'); pg.wait_for_timeout(300); pg.click('#menu >> text=New Game'); pg.wait_for_timeout(300); ok(not pg.is_checked('input[data-in="ng:tutorial"]'), 'after finishing, new games default to no tutorial')
    b.close()
print('errors', errors); print('%d checks, %d failed' % (len(checks), checks.count(False)))
