//@ts-check
'use strict';

/** @template T
 * @returns {T}
*/
// @ts-ignore
const NN = (/** @type {T | null} */ x) => x;
const $I = (s) => NN(document.getElementById(s));

/** @ts-ignore */
const MT = Matter;

/**
 * @typedef BallInfo
 * @property {number} i
 * @property {number} gid
 * @property {number} pos_y
 * @property {HTMLElement} elm
 * @property {() => void} update
 */

(async () => {
    const G = 0.001;
    const PHY_SCL = 100;

    let drop_pos = 0.5;
    let queue_next_ty = 1;

    let balls = {};
    
    let el_balls_par = $I("ball_container");
    let _ball_uid_counter = 0;

    let engine = MT.Engine.create();
    let world = engine.world;
    engine.gravity.scale = 0.0005;
    
    MT.Composite.add(world, [
        MT.Bodies.rectangle(-1, -100, 2, 200, { isStatic: true }),
        MT.Bodies.rectangle(101, -100, 2, 200, { isStatic: true }),
        MT.Bodies.rectangle(50, 10, 100, 20, { isStatic: true }),
    ]);

    let score = 0;
    function inc_score(i) {
        score += 5 * i * i;
        $I("score_num").innerText = ("" + score).padStart(10, "0");
    }

    function coord_c2w(x, y) {
        return [x * 100, y * -100];
    }
    function coord_w2c(v) {
        return [v.x * 0.01, v.y * -0.01];
    }

    class Ball {
        constructor(i, x, y) {
            this.i = i;

            this.body = MT.Bodies.circle(...coord_c2w(x, y), PHY_SCL * 0.025 * i, {}, 50);
            this.gid = this.body.id;
            MT.Composite.add(world, [
                this.body
            ]);

            this.wid = 0;

            let id = `ball_uid_${_ball_uid_counter}`;
            el_balls_par.insertAdjacentHTML('beforeend', `<div id="${id}" class="ball b_${i}" style="--y:1.5;"></div>`);
            _ball_uid_counter += 1;
            this.elm = $I(id);

            balls[this.gid] = this;
        }
        update() {
            let pos = coord_w2c(this.body.position);
            let rot = this.body.angle;
            this.elm.style.setProperty("--x", "" + pos[0]);
            this.elm.style.setProperty("--y", "" + pos[1]);
            this.elm.style.setProperty("--rt", "" + rot);

            this.pos_y = pos[1];
        }
        remove() {
            delete balls[this.gid];
            el_balls_par.removeChild(this.elm);
            MT.Composite.remove(world, this.body);
        }
    }

    MT.Events.on(engine, "collisionStart", cols => {
        for (let c of cols.pairs) {
            let ba = balls[c.bodyA.id];
            let bb = balls[c.bodyB.id];
            if (ba == undefined || bb == undefined) continue;
            if (ba.i !== bb.i) continue;
            
            inc_score(ba.i);
            let i2 = ba.i + 1;
            if (i2 > 10) continue; //delete this line to remove suikas
            let pos2 = coord_w2c(MT.Vector.mult(MT.Vector.add(c.bodyA.position, c.bodyB.position), 0.5));
            ba.remove();
            bb.remove();
            if (i2 < 11) {
                new Ball(i2, ...pos2);
            }
        }
    });

    /** @type {HTMLElement | null} */
    let el_queue = null;
    let el_queue_par = $I("ball_preview");

    function create_next_drop() {
        let rnd = Math.pow(Math.random(), 2);
        queue_next_ty = Math.floor(rnd * 4) + 1;
        el_queue_par.innerHTML = `<div id="ball_prv" class="ball b_${queue_next_ty}" style="--y:1.5;"></div>`;
        el_queue = $I("ball_prv");
        on_move_drop_pos();
    }
    function on_move_drop_pos() {
        if (el_queue !== null) {
            el_queue.style.setProperty("--x", "" + drop_pos);
        }
    }
    function on_apply_drop() {
        new Ball(queue_next_ty, drop_pos, 1.5);
        el_queue_par.innerHTML = "";
    }

    create_next_drop();

    let is_playing = true;
    
    let drop_cd = 0.0;

    const min_dt = 1600;
    const max_dt = 2000;
    let dt = 0;
    function loop(_dt) {
        requestAnimationFrame(loop);
        if (is_playing) {
            dt += _dt;
            if (dt < min_dt) return;
            if (dt > max_dt) dt = max_dt;
            if (drop_cd > 0) {
                drop_cd -= 0.02;
                if (drop_cd < 0) {
                    create_next_drop();
                }
            }
            MT.Engine.update(engine);
            Object.entries(balls).forEach(([_, b]) => {
                b.update();
                if (b.pos_y > 1.51) {
                    is_playing = false;
                    $I("game").classList.add("gameover");
                }
            });
            
            dt -= min_dt;
        }
    }

    requestAnimationFrame(loop);

    function on_mouse_move(e) {
        if (!is_playing) return;
        let W = document.body.clientWidth;
        let H = document.body.clientHeight;
        let v = ((e.clientX - W * 0.5) / H) * 2 + 0.5;
        drop_pos = Math.min(0.99, Math.max(0.01, v));
        on_move_drop_pos();
    }

    document.addEventListener("mousemove", on_mouse_move);
    document.addEventListener("click", e => {
        if (!is_playing) return;
        if (drop_cd > 0) return;
        on_mouse_move(e);
        on_apply_drop();
        drop_cd = 1.0;
    });
})();