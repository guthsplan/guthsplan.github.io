// Blog diagrams, written as Excalidraw "skeleton" elements.
// tools/excalidraw-export.html converts them with Excalidraw's own library and saves
//   assets/diagrams/<name>.svg        (embedded in posts)
//   assets/diagrams/<name>.excalidraw (open / edit at excalidraw.com)

const C = {
  ink: '#1e1e1e', blue: '#1f2fcf', muted: '#868e96',
  green: '#b2f2bb', violet: '#d0bfff', blueBg: '#a5d8ff', teal: '#c3fae8',
  yellow: '#ffec99', orange: '#ffd8a8', red: '#ffc9c9', grey: '#e9ecef', white: '#ffffff',
};

function scene() {
  const els = [];
  const boxes = {};
  const api = {
    box(id, x, y, w, h, text, o = {}) {
      boxes[id] = { x, y, w, h };
      els.push({
        type: o.shape || 'rectangle', id, x, y, width: w, height: h,
        strokeColor: o.stroke || C.ink, backgroundColor: o.bg || 'transparent', fillStyle: 'solid',
        strokeWidth: o.sw || 2, roughness: 1, roundness: o.shape ? null : { type: 3 },
        strokeStyle: o.dashed ? 'dashed' : 'solid',
        label: text ? { text, fontSize: o.fs || 18, strokeColor: o.color || C.ink } : undefined,
      });
      return api;
    },
    text(x, y, text, o = {}) {
      els.push({ type: 'text', x, y, text, fontSize: o.fs || 16, strokeColor: o.color || C.muted, textAlign: o.align || 'left' });
      return api;
    },
    // arrow between two boxes. side: r (right), l (left), d (down), u (up)
    arrow(from, to, side, label, o = {}) {
      const a = boxes[from], b = boxes[to];
      let x, y, w, h;
      const ay = o.ay ?? a.y + a.h / 2, by = o.by ?? b.y + b.h / 2;
      const ax = o.ax ?? a.x + a.w / 2, bx = o.bx ?? b.x + b.w / 2;
      if (side === 'r') { x = a.x + a.w; y = ay; w = b.x - x; h = by - ay; }
      if (side === 'l') { x = a.x; y = ay; w = b.x + b.w - x; h = by - ay; }
      if (side === 'd') { x = ax; y = a.y + a.h; w = bx - ax; h = b.y - y; }
      if (side === 'u') { x = ax; y = a.y; w = bx - ax; h = b.y + b.h - y; }
      els.push({
        type: 'arrow', x, y, width: w, height: h,
        points: [[0, 0], [w, h]],
        strokeColor: o.stroke || C.ink, strokeWidth: o.sw || 2, roughness: 1,
        strokeStyle: o.dashed ? 'dashed' : 'solid',
        endArrowhead: o.both ? 'arrow' : 'arrow', startArrowhead: o.both ? 'arrow' : null,
        start: { id: from }, end: { id: to },
        label: label && !(side === 'r' || side === 'l') ? { text: label, fontSize: o.fs || 15, strokeColor: o.color || C.ink } : undefined,
      });
      // horizontal arrows: label as free text above (or below) the line, so the line never crosses it
      if (label && (side === 'r' || side === 'l')) {
        const fs = o.fs || 15, lines = label.split('\n');
        const tw = Math.max(...lines.map((l) => l.length)) * fs * 0.56;
        const midx = x + w / 2;
        const ty = o.below ? Math.max(y, y + h) + 14 : Math.min(y, y + h) - 10 - lines.length * fs * 1.25;
        els.push({ type: 'text', x: midx - tw / 2, y: ty, text: label, fontSize: fs, strokeColor: o.color || C.ink, textAlign: 'center' });
      }
      return api;
    },
    els,
  };
  return api;
}

export const diagrams = [];

/* ---------------------------------------------------------------- AgentBeats */

// 1. Agentified Agent Assessment: the benchmark is itself an agent
{
  const s = scene();
  s.text(0, 0, 'Agentified Agent Assessment', { fs: 26, color: C.ink })
    .text(0, 38, 'the benchmark is an agent too; the two only talk through a protocol', { fs: 16 })
    .box('green', 0, 110, 270, 170, 'Green agent\n(the judge)\n\nenvironment · tasks · scoring', { bg: C.green })
    .box('purple', 560, 110, 270, 170, 'Purple agent\n(the player)\n\nthe agent under test', { bg: C.violet })
    .arrow('green', 'purple', 'r', 'A2A · task + observations', { ay: 160, by: 160 })
    .arrow('purple', 'green', 'l', 'A2A · actions / answers', { ay: 230, by: 230 })
    .box('board', 0, 360, 270, 70, 'leaderboard', { bg: C.grey })
    .box('tools', 560, 360, 270, 70, 'tools', { bg: C.grey })
    .arrow('green', 'board', 'd', 'scores')
    .arrow('purple', 'tools', 'd', 'MCP')
    .text(0, 460, 'write a purple agent once → drop it into any benchmark on the platform', { fs: 16 });
  diagrams.push({ name: 'agentbeats-aaa', elements: s.els });
}

// 2. Phase 1: grading Minecraft (the MCU green agent)
{
  const s = scene();
  s.text(0, 0, 'Phase 1 · the judge (MCU green agent)', { fs: 26, color: C.ink })
    .box('task', 0, 80, 200, 90, 'task config\n12 categories', { bg: C.yellow })
    .box('env', 290, 80, 220, 90, 'Minecraft\n(MineStudio)', { bg: C.green })
    .box('player', 830, 80, 200, 90, 'purple agent', { bg: C.violet })
    .arrow('task', 'env', 'r', 'init')
    .arrow('env', 'player', 'r', 'obs: 128×128 RGB', { ay: 100, by: 100 })
    .arrow('player', 'env', 'l', 'action: compact / expanded / env', { ay: 150, by: 150, below: true })
    .box('maxed', 290, 260, 220, 130, 'milestones\nall reached?', { shape: 'diamond', bg: C.white })
    .arrow('env', 'maxed', 'd', 'simulator reward')
    .box('simonly', 0, 450, 230, 80, 'final = sim score', { bg: C.grey })
    .box('judge', 560, 440, 280, 100, 'VLM judge on the video\n6 rubric dimensions', { bg: C.blueBg })
    .box('blend', 560, 600, 280, 80, 'final = (sim + progress) / 2', { bg: C.grey })
    .arrow('maxed', 'simonly', 'l', 'yes', { ay: 325, bx: 115 })
    .arrow('maxed', 'judge', 'r', 'no', { ay: 325, bx: 700 })
    .arrow('judge', 'blend', 'd', '')
    .text(0, 580, 'long-horizon tasks (ender dragon,\ndiamond from scratch): 12,000 steps,\nscore = milestones done + partial credit', { fs: 15 })
    .text(560, 700, 'rubric: progress · action control · error recognition ·\ncreative attempts · efficiency · material selection', { fs: 14 });
  diagrams.push({ name: 'agentbeats-judge', elements: s.els });
}

// 3. Phase 2: VGI-Player, "System 1.5"
{
  const s = scene();
  s.text(0, 0, 'Phase 2 · the player (VGI-Player, "System 1.5")', { fs: 26, color: C.ink })
    .box('prompt', 0, 210, 150, 80, 'task prompt', { bg: C.yellow })
    .box('router', 200, 170, 230, 160, 'LLM router:\nshort or long?', { shape: 'diamond', bg: C.white, fs: 16 })
    .arrow('prompt', 'router', 'r', '')
    .box('single', 470, 80, 200, 80, 'one instruction', { bg: C.grey })
    .box('s1', 440, 380, 160, 90, 'state 1\ninstruction\n+ timeout', { bg: C.orange, fs: 16 })
    .box('s2', 650, 380, 160, 90, 'state 2\ninstruction\n+ timeout', { bg: C.orange, fs: 16 })
    .box('s3', 860, 380, 160, 90, 'state n\n…', { bg: C.orange, fs: 16 })
    .box('fb', 650, 530, 160, 70, 'fallback state', { bg: C.red, fs: 16 })
    .arrow('router', 'single', 'r', 'short', { ay: 210, by: 120 })
    .arrow('router', 's1', 'd', '', { ax: 315, bx: 470 })
    .text(250, 395, 'long →\ncompile a plan', { fs: 15, color: C.ink })
    .arrow('s1', 's2', 'r', 'done')
    .arrow('s2', 's3', 'r', 'done')
    .arrow('s2', 'fb', 'd', 'timeout', { dashed: true })
    .box('vla', 760, 70, 220, 100, 'JarvisVLA\n(Qwen2-VL 7B)', { bg: C.green })
    .box('act', 1060, 80, 170, 80, 'mouse + keys', { bg: C.violet })
    .arrow('single', 'vla', 'r', '')
    .arrow('s2', 'vla', 'u', 'current instruction', { dashed: true, ax: 730, bx: 840 })
    .arrow('vla', 'act', 'r', '')
    .text(200, 140, 'thinks once, up front', { fs: 15, color: C.blue })
    .text(1000, 180, 'acts every step', { fs: 15, color: C.blue })
    .text(440, 630, 'the harness only decides when to move on; the VLA never sees the plan', { fs: 15 });
  diagrams.push({ name: 'agentbeats-player', elements: s.els });
}

/* ---------------------------------------------------------------- BEHAVIOR 2026 */

// 4. Overview of the policy
{
  const s = scene();
  s.text(0, 0, 'VGI-SKT policy for BEHAVIOR 2026', { fs: 26, color: C.ink })
    .box('cams', 0, 430, 180, 80, '3 cameras\nhead + 2 wrists', { bg: C.grey, fs: 16 })
    .box('instr', 210, 430, 180, 80, 'task instruction\n"cook the hot dogs"', { bg: C.yellow, fs: 16 })
    .box('prop', 420, 430, 160, 80, 'proprioception\n27-D', { bg: C.grey, fs: 16 })
    .box('vlm', 0, 270, 580, 100, 'G0.5 VLM\nQwen3.5-2B decoder + ViT', { bg: C.green, fs: 20 })
    .arrow('cams', 'vlm', 'u', '')
    .arrow('instr', 'vlm', 'u', '')
    .arrow('prop', 'vlm', 'u', '')
    .box('ar', 0, 110, 240, 80, 'ActionCodec tokens\n(autoregressive)', { bg: C.blueBg, fs: 16 })
    .box('subtask', 280, 110, 300, 80, 'Subtask:\npick up hotdog from fridge', { bg: C.orange, fs: 16 })
    .arrow('vlm', 'subtask', 'u', '1. generate', { ax: 430, bx: 430 })
    .arrow('vlm', 'ar', 'u', '2. generate', { ax: 120, bx: 120 })
    .box('lora', 760, 110, 230, 80, 'skill LoRA\n(6 motion groups)', { bg: C.orange, fs: 16, dashed: true })
    .box('ae', 760, 270, 230, 100, 'Action expert\nflow matching', { bg: C.teal, fs: 20 })
    .box('chunk', 1130, 270, 190, 100, '32-step\naction chunk', { bg: C.violet })
    .arrow('subtask', 'lora', 'r', 'route by skill', { ay: 130, by: 130 })
    .arrow('lora', 'ae', 'd', '')
    .arrow('vlm', 'ae', 'r', 'KV cache')
    .arrow('ae', 'chunk', 'r', 'denoise')
    .text(760, 400, 'the belief-graph targets supervise this stream during\ntraining only; at test time it writes just the subtask', { fs: 15 })
    .text(0, 70, 'hybrid variant: arms decoded from these tokens; base, torso, grippers from the expert', { fs: 14 });
  diagrams.push({ name: 'b1k-overview', elements: s.els });
}

// 5. Three training stages
{
  const s = scene();
  s.text(0, 0, 'Three stages', { fs: 26, color: C.ink })
    .box('st1', 0, 70, 300, 190, 'Stage 1 · G0.5-base\n\nfull fine-tune\n20,000 demos · 100 tasks\naction loss only\n700k / 800k steps · 8×H200', { bg: C.green, fs: 16 })
    .box('st2', 380, 70, 300, 190, 'Stage 2 · BG-CoT\n\nLoRA on VLM + action expert\nbelief-graph CoT targets\nskill-balanced sampling\n180k steps · 8×H200', { bg: C.orange, fs: 16 })
    .box('st3', 760, 70, 300, 190, 'Stage 3 · skill LoRA\n\naction expert only\n6 motion-centric groups\nrouted by predicted subtask\n70k–200k steps · 1×4090', { bg: C.teal, fs: 16 })
    .arrow('st1', 'st2', 'r', 'init')
    .arrow('st2', 'st3', 'r', 'init')
    .box('q1', 75, 300, 150, 60, 'Q 0.298', { bg: C.white })
    .box('q2', 455, 300, 150, 60, 'Q 0.360', { bg: C.white, stroke: C.blue, color: C.blue })
    .box('q3', 835, 300, 150, 60, 'Q 0.352', { bg: C.white })
    .arrow('st1', 'q1', 'd', '')
    .arrow('st2', 'q2', 'd', '')
    .arrow('st3', 'q3', 'd', '')
    .box('routed', 300, 420, 480, 80, 'task-routed submission: Q 0.445 · 22.3% success', { bg: C.violet })
    .arrow('q2', 'routed', 'd', 'pick the best of 6 configs per task')
    .text(0, 530, 'mean Q-score over 1,000 public rollouts (100 tasks × 10 instances). The routed number reuses\nthe same rollouts it was selected on, so part of the gain is a selection effect.', { fs: 15 });
  diagrams.push({ name: 'b1k-stages', elements: s.els });
}

// 6. Belief-graph chain-of-thought targets
{
  const s = scene();
  s.text(0, 0, 'Belief-graph CoT: supervision, not a planner', { fs: 26, color: C.ink })
    .box('sim', 0, 90, 250, 110, 'recorded simulator states\n+ BDDL goals\n+ skill annotations', { bg: C.grey, fs: 16 })
    .box('bg', 320, 90, 250, 110, 'belief graph\n10 Hz predicates\n+ confidence', { bg: C.yellow, fs: 16 })
    .arrow('sim', 'bg', 'r', '')
    .box('f1', 660, 60, 340, 56, 'Subtask · pick up hotdog_208 from fridge', { bg: C.orange, fs: 15 })
    .box('f2', 660, 126, 340, 56, 'Delta · (cooked ?x) 0/2', { bg: C.white, fs: 15 })
    .box('f3', 660, 192, 340, 56, 'Belief · (open fridge) 0.97 mem', { bg: C.white, fs: 15 })
    .box('f4', 660, 258, 340, 56, 'Effect · (open fridge) 1 > 0', { bg: C.white, fs: 15 })
    .box('f5', 660, 324, 340, 56, 'Observe · (open fridge) 1', { bg: C.white, fs: 15 })
    .arrow('bg', 'f1', 'r', '', { by: 88 })
    .arrow('bg', 'f3', 'r', '')
    .arrow('bg', 'f5', 'r', '', { by: 352 })
    .text(660, 396, 'training: one target builder per sample,\nthen the action tokens', { fs: 15 })
    .box('test', 660, 450, 340, 70, 'test time: generate the Subtask only', { bg: C.blueBg, fs: 16, stroke: C.blue, color: C.blue })
    .text(0, 260, 'an earlier version fed the graph back in\nas input — one wrong observation then\nstuck around for the rest of the episode', { fs: 15 });
  diagrams.push({ name: 'b1k-bgcot', elements: s.els });
}
