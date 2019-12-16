
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Note.svelte generated by Svelte v3.16.4 */

    const file = "src/Note.svelte";

    function create_fragment(ctx) {
    	let div;
    	let div_style_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");

    			attr_dev(div, "style", div_style_value = /*active*/ ctx[0]
    			? "background-color:#b399d4"
    			: /*clicked*/ ctx[1] ? "background-color:#fac282" : "");

    			attr_dev(div, "class", "svelte-1n6oi0d");
    			add_location(div, file, 50, 0, 1063);
    			dispose = listen_dev(div, "click", /*click_handler*/ ctx[10], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*active, clicked*/ 3 && div_style_value !== (div_style_value = /*active*/ ctx[0]
    			? "background-color:#b399d4"
    			: /*clicked*/ ctx[1] ? "background-color:#fac282" : "")) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { active = false } = $$props;
    	let clicked = false;
    	let { freq = 27 } = $$props;
    	let myosc = null;
    	const audioContext = new AudioContext();
    	const masterGainNode = audioContext.createGain();
    	masterGainNode.connect(audioContext.destination);
    	masterGainNode.gain.value = 0.5;
    	const sineTerms = new Float32Array([0, 0, 1, 0, 1]);
    	const cosineTerms = new Float32Array(sineTerms.length);
    	const customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);

    	function playTone(freq) {
    		let osc = audioContext.createOscillator();
    		osc.connect(masterGainNode);
    		osc.type = "cosine";
    		osc.frequency.value = freq;
    		osc.start();
    		$$invalidate(3, myosc = osc);
    	}

    	const writable_props = ["active", "freq"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Note> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, clicked = !clicked);

    	$$self.$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("freq" in $$props) $$invalidate(2, freq = $$props.freq);
    	};

    	$$self.$capture_state = () => {
    		return { active, clicked, freq, myosc };
    	};

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("clicked" in $$props) $$invalidate(1, clicked = $$props.clicked);
    		if ("freq" in $$props) $$invalidate(2, freq = $$props.freq);
    		if ("myosc" in $$props) $$invalidate(3, myosc = $$props.myosc);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*active, clicked, freq, myosc*/ 15) {
    			 {
    				if (active && clicked) {
    					playTone(freq);
    				}
    			}
    		}
    	};

    	return [
    		active,
    		clicked,
    		freq,
    		myosc,
    		masterGainNode,
    		audioContext,
    		sineTerms,
    		cosineTerms,
    		customWaveform,
    		playTone,
    		click_handler
    	];
    }

    class Note extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { active: 0, freq: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Note",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get active() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get freq() {
    		throw new Error("<Note>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set freq(value) {
    		throw new Error("<Note>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Timeline.svelte generated by Svelte v3.16.4 */
    const file$1 = "src/Timeline.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (27:2) {#each measureArray as measure, i}
    function create_each_block(ctx) {
    	let current;

    	const note = new Note({
    			props: {
    				active: /*i*/ ctx[6] == /*count*/ ctx[2],
    				freq: /*freq*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(note.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(note, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const note_changes = {};
    			if (dirty[0] & /*count*/ 4) note_changes.active = /*i*/ ctx[6] == /*count*/ ctx[2];
    			if (dirty[0] & /*freq*/ 2) note_changes.freq = /*freq*/ ctx[1];
    			note.$set(note_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(note.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(note.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(note, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(27:2) {#each measureArray as measure, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let each_value = /*measureArray*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(div, "grid-template-columns", "repeat(" + /*measures*/ ctx[0] + ", 1fr)");
    			attr_dev(div, "class", "svelte-1dqbne0");
    			add_location(div, file$1, 25, 0, 480);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*count, freq*/ 6) {
    				each_value = /*measureArray*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*measures*/ 1) {
    				set_style(div, "grid-template-columns", "repeat(" + /*measures*/ ctx[0] + ", 1fr)");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { measures = 12 } = $$props;
    	let { freq = 27 } = $$props;
    	let count = 0;
    	const measureArray = Array.from({ length: measures });

    	onMount(async () => {
    		setInterval(
    			() => {
    				$$invalidate(2, count = (count + 1) % measures);
    			},
    			200
    		);
    	});

    	const writable_props = ["measures", "freq"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timeline> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("measures" in $$props) $$invalidate(0, measures = $$props.measures);
    		if ("freq" in $$props) $$invalidate(1, freq = $$props.freq);
    	};

    	$$self.$capture_state = () => {
    		return { measures, freq, count };
    	};

    	$$self.$inject_state = $$props => {
    		if ("measures" in $$props) $$invalidate(0, measures = $$props.measures);
    		if ("freq" in $$props) $$invalidate(1, freq = $$props.freq);
    		if ("count" in $$props) $$invalidate(2, count = $$props.count);
    	};

    	return [measures, freq, count, measureArray];
    }

    class Timeline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { measures: 0, freq: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timeline",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get measures() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set measures(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get freq() {
    		throw new Error("<Timeline>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set freq(value) {
    		throw new Error("<Timeline>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */

    const { console: console_1 } = globals;
    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let current;
    	let dispose;

    	const timeline0 = new Timeline({
    			props: { measures: 24, freq: 880 },
    			$$inline: true
    		});

    	const timeline1 = new Timeline({
    			props: { measures: 24, freq: 742.5 },
    			$$inline: true
    		});

    	const timeline2 = new Timeline({
    			props: { measures: 24, freq: 660 },
    			$$inline: true
    		});

    	const timeline3 = new Timeline({
    			props: { measures: 24, freq: 556.875 },
    			$$inline: true
    		});

    	const timeline4 = new Timeline({
    			props: { measures: 24, freq: 495 },
    			$$inline: true
    		});

    	const timeline5 = new Timeline({
    			props: { measures: 24, freq: 440 },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(timeline0.$$.fragment);
    			t0 = space();
    			create_component(timeline1.$$.fragment);
    			t1 = space();
    			create_component(timeline2.$$.fragment);
    			t2 = space();
    			create_component(timeline3.$$.fragment);
    			t3 = space();
    			create_component(timeline4.$$.fragment);
    			t4 = space();
    			create_component(timeline5.$$.fragment);
    			attr_dev(main, "class", "svelte-1e74fro");
    			add_location(main, file$2, 47, 0, 881);
    			dispose = listen_dev(window, "keydown", /*handleKeyDown*/ ctx[0], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(timeline0, main, null);
    			append_dev(main, t0);
    			mount_component(timeline1, main, null);
    			append_dev(main, t1);
    			mount_component(timeline2, main, null);
    			append_dev(main, t2);
    			mount_component(timeline3, main, null);
    			append_dev(main, t3);
    			mount_component(timeline4, main, null);
    			append_dev(main, t4);
    			mount_component(timeline5, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timeline0.$$.fragment, local);
    			transition_in(timeline1.$$.fragment, local);
    			transition_in(timeline2.$$.fragment, local);
    			transition_in(timeline3.$$.fragment, local);
    			transition_in(timeline4.$$.fragment, local);
    			transition_in(timeline5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timeline0.$$.fragment, local);
    			transition_out(timeline1.$$.fragment, local);
    			transition_out(timeline2.$$.fragment, local);
    			transition_out(timeline3.$$.fragment, local);
    			transition_out(timeline4.$$.fragment, local);
    			transition_out(timeline5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(timeline0);
    			destroy_component(timeline1);
    			destroy_component(timeline2);
    			destroy_component(timeline3);
    			destroy_component(timeline4);
    			destroy_component(timeline5);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { name } = $$props;

    	const handleKeyDown = e => {
    		let key = e.key;
    		console.log(key);
    	};

    	onMount(async () => {
    		function onMIDISuccess(midiAccess) {
    			for (var input of midiAccess.inputs.values()) input.onmidimessage = getMIDIMessage;
    		}

    		function getMIDIMessage(midiMessage) {
    			console.log(midiMessage);
    		}

    		try {
    			const midiAccess = await navigator.requestMIDIAccess();
    			onMIDISuccess(midiAccess);
    		} catch(e) {
    			console.error(e);
    		}
    	});

    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	return [handleKeyDown, name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[1] === undefined && !("name" in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
