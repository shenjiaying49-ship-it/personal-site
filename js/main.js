// ---------- burger / nav overlay ----------

const burger = document.querySelector('.js-burger');
const navOverlay = document.querySelector('.js-nav-overlay');

burger.addEventListener('click', () => {
  burger.classList.toggle('is-open');
  navOverlay.classList.toggle('is-open');
});

document.querySelectorAll('.js-nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    navOverlay.classList.remove('is-open');
  });
});

// ---------- projects：中间头像是一段段抠好图的真人短视频，自己会循环
// 随机切换播放（一段播完自动挑下一段），点一个 logo 也会立刻切到下一段。
// 变成小猫那段概率给得最低，偶尔出现就好，不能喧宾夺主。
//
// 两段视频用两个叠在一起的 <video> 交叉淡化切换，不是直接换同一个
// <video> 的 src——直接换 src 中间有一瞬间没画面，会露出页面白底，看起来
// 像"闪白"。这里提前把下一段加载到"后台"那个 <video> 里，等它真的能出
// 画面了（canplay）才把两边的 opacity 交叉切过去，台前台后同时有画面，
// 不会有空白的瞬间。 ----------

const projectsAvatarEl = document.querySelector('.js-projects-avatar');
const avatarVideoEls = document.querySelectorAll('.js-avatar-img');
const avatarBadgeEl = document.querySelector('.js-avatar-badge');

const VIDEO_CLIPS = [
  { src: 'assets/avatar/video/vid-1.mp4', emoji: '😎', weight: 1 },
  { src: 'assets/avatar/video/vid-2.mp4', emoji: '😉', weight: 1 },
  { src: 'assets/avatar/video/vid-3.mp4', emoji: '🙂', weight: 1 },
  { src: 'assets/avatar/video/vid-4.mp4', emoji: '🥰', weight: 1 },
  { src: 'assets/avatar/video/vid-cat.mp4', emoji: '💕', weight: 0.25 }, // 权重最低，变猫最少见
];

let currentClipSrc = avatarVideoEls[0].getAttribute('src');
let activeVideoIndex = 0;
let isSwitchingClip = false;

// 提前把"下一段"缓存到闲置的那个 <video> 里，而不是等到真要切的那一刻
// 才发起下载——一段视频播 4~5 秒，足够把下一段（压缩后只有 200~500KB）
// 在后台下完，等真正要切的时候直接就绪，不用现等网络。preloadedClip 记
// 录预下载的是哪一段，配合下面 pickNextClip 的排除逻辑，保证不会跟当前
// 正在播的重复。
let preloadedClip = null;

function pickNextClip(excludeSrc) {
  const pool = VIDEO_CLIPS.filter((c) => c.src !== excludeSrc);
  const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * totalWeight;
  for (const clip of pool) {
    r -= clip.weight;
    if (r <= 0) return clip;
  }
  return pool[pool.length - 1];
}

// 往当前闲置（非台前）的 <video> 里预下载一段，跟正在播的那段不重复。
function prefetchNextClip() {
  const idleEl = avatarVideoEls[1 - activeVideoIndex];
  const clip = pickNextClip(currentClipSrc);
  preloadedClip = clip;
  idleEl.src = clip.src;
  idleEl.load();
}

function playNextClip() {
  if (isSwitchingClip) return;
  isSwitchingClip = true;

  const outgoingEl = avatarVideoEls[activeVideoIndex];
  const incomingEl = avatarVideoEls[1 - activeVideoIndex];

  // 闲置的 <video> 里如果已经预下载了下一段（src 跟 preloadedClip 对得上），
  // 直接用它，不再重新挑一个、重新发请求——不然预下载就白做了。只有极端
  // 情况（比如第一次点击发生在初始预下载排好队之前）才现挑现下。
  const next = preloadedClip && incomingEl.getAttribute('src') === preloadedClip.src
    ? preloadedClip
    : pickNextClip(currentClipSrc);

  if (next !== preloadedClip) {
    incomingEl.src = next.src;
    incomingEl.load();
  }
  currentClipSrc = next.src;
  preloadedClip = null;

  const startCrossfade = () => {
    incomingEl.currentTime = 0;
    incomingEl.play().catch(() => {});
    incomingEl.classList.add('is-active');
    outgoingEl.classList.remove('is-active');

    activeVideoIndex = 1 - activeVideoIndex;
    isSwitchingClip = false;

    // 交叉淡化的过渡时长跟 CSS 的 opacity transition 对齐，动画放完了再
    // 暂停旧视频，省着点性能。暂停完就闲下来了，立刻拿它去预下载下一段。
    setTimeout(() => {
      outgoingEl.pause();
      prefetchNextClip();
    }, 650);
  };

  if (incomingEl.readyState >= 3) {
    startCrossfade();
  } else {
    incomingEl.addEventListener('canplay', startCrossfade, { once: true });
  }

  avatarBadgeEl.textContent = next.emoji;
  avatarBadgeEl.classList.remove('is-popping');
  void avatarBadgeEl.offsetWidth;
  avatarBadgeEl.classList.add('is-popping');
}

// 页面一开始 vid-1 就在台前自动播了，趁这 4 秒把第二段先下起来
prefetchNextClip();

// 一段视频自然播完，自动接下一段（轮回随机播放）——只有当前台前显示的
// 那个 <video> 触发 ended 才算数，后台那个不会自然播到结尾。
avatarVideoEls.forEach((el) => {
  el.addEventListener('ended', () => {
    if (el.classList.contains('is-active')) playNextClip();
  });
});

projectsAvatarEl.addEventListener('click', () => {
  projectsAvatarEl.classList.remove('is-poked');
  void projectsAvatarEl.offsetWidth;
  projectsAvatarEl.classList.add('is-poked');
});

// ---------- 头像旁边随机飘一些可爱小图标，纯装饰，跟表情切换没关系，
// 隔几秒钟自己冒一个出来，飘一下就消失 ----------

const floatLayerEl = document.querySelector('.js-float-layer');
const projectsSectionForFloat = document.querySelector('#projects');
const CUTE_FLOAT_ICONS = ['🎀', '✨', '💫', '🌟', '🧸', '🍀', '🦋', '🎈', '💝', '🌸'];

function spawnFloatingIcon() {
  const icon = document.createElement('span');
  icon.className = 'projects__float-icon';
  icon.textContent = CUTE_FLOAT_ICONS[Math.floor(Math.random() * CUTE_FLOAT_ICONS.length)];

  const angle = Math.random() * Math.PI * 2;
  const radius = 34 + Math.random() * 20;
  const startX = 50 + Math.cos(angle) * radius;
  const startY = 50 + Math.sin(angle) * radius;
  icon.style.left = `${startX}%`;
  icon.style.top = `${startY}%`;
  icon.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 50}px`);
  icon.style.fontSize = `${1 + Math.random() * 0.7}rem`;

  floatLayerEl.appendChild(icon);
  icon.addEventListener('animationend', () => icon.remove());
}

function scheduleFloatingIcon() {
  const delay = 1600 + Math.random() * 2400;
  setTimeout(() => {
    if (projectsSectionForFloat.classList.contains('is-revealed')) {
      spawnFloatingIcon();
    }
    scheduleFloatingIcon();
  }, delay);
}

scheduleFloatingIcon();

// ---------- 点 logo：侧边抽屉展示经历详情 ----------

const LIKED_KEY = 'jocelyn-site-liked-projects';

function getLikedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLikedSet(set) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
}

const likedProjects = getLikedSet();

const drawerEl = document.querySelector('.js-project-drawer');
const drawerBackdropEl = document.querySelector('.js-drawer-backdrop');
const drawerCloseEl = document.querySelector('.js-drawer-close');
const drawerTitleEl = document.querySelector('.js-drawer-title');
const drawerRoleEl = document.querySelector('.js-drawer-role');
const drawerDescEl = document.querySelector('.js-drawer-desc');
const drawerImgWrapEl = document.querySelector('.js-drawer-img-wrap');
const drawerImgEl = document.querySelector('.js-drawer-img');
const drawerLikeEl = document.querySelector('.js-drawer-like');

let drawerCurrentTitle = null;

function openProjectDrawer(node) {
  const { title, role, desc, img = '' } = node.dataset;

  drawerTitleEl.textContent = title;
  drawerRoleEl.textContent = role;
  drawerDescEl.textContent = desc;

  if (img) {
    drawerImgEl.src = img;
    drawerImgEl.alt = title;
    drawerImgWrapEl.classList.add('has-img');
  } else {
    drawerImgWrapEl.classList.remove('has-img');
    drawerImgEl.src = '';
  }

  drawerCurrentTitle = title;
  const isLiked = likedProjects.has(title);
  drawerLikeEl.classList.toggle('is-liked', isLiked);
  drawerLikeEl.setAttribute('aria-pressed', String(isLiked));

  // 判断 logo 在屏幕左边还是右边，卡片跟着出现在对应侧
  const rect = node.getBoundingClientRect();
  const nodeCenter = rect.left + rect.width / 2;
  const side = nodeCenter > window.innerWidth / 2 ? 'right' : 'left';
  drawerEl.classList.remove('project-drawer--right', 'project-drawer--left');
  drawerEl.classList.add(`project-drawer--${side}`);

  drawerEl.removeAttribute('hidden');
  requestAnimationFrame(() => drawerEl.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
}

function closeProjectDrawer() {
  drawerEl.classList.remove('is-open');
  document.body.style.overflow = '';
  drawerEl.addEventListener('transitionend', () => {
    if (!drawerEl.classList.contains('is-open')) drawerEl.setAttribute('hidden', '');
  }, { once: true });
}

document.querySelectorAll('.js-project-node').forEach((node) => {
  node.addEventListener('click', () => {
    openProjectDrawer(node);
    playNextClip();
  });
});

drawerBackdropEl.addEventListener('click', closeProjectDrawer);
drawerCloseEl.addEventListener('click', closeProjectDrawer);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawerEl.classList.contains('is-open')) closeProjectDrawer();
});

drawerLikeEl.addEventListener('click', () => {
  if (!drawerCurrentTitle) return;
  const isLiked = drawerLikeEl.classList.toggle('is-liked');
  drawerLikeEl.setAttribute('aria-pressed', String(isLiked));

  if (isLiked) {
    likedProjects.add(drawerCurrentTitle);
  } else {
    likedProjects.delete(drawerCurrentTitle);
  }
  saveLikedSet(likedProjects);

  drawerLikeEl.classList.remove('is-popping');
  void drawerLikeEl.offsetWidth;
  drawerLikeEl.classList.add('is-popping');
});

// ---------- cursor + 单圆遮罩（不做拖尾，只跟随当前位置） ----------

const cursorEl = document.querySelector('.js-cursor');
const sceneEl = document.querySelector('.js-scene');
const heroStage = document.querySelector('.hero-stage');

const SPOTLIGHT_RADIUS = 260;
const EASE = 0.3; // 光标跟手的平滑程度，越大越跟手
const HIDDEN_MASK = 'radial-gradient(circle 0px at -999px -999px, white 0%, transparent 100%)';

const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const current = { ...target };
let stageActive = false;

// 触屏设备没有鼠标，深色层永远出不来，等于最有态度的那几句文案在手机上
// 不存在。降级方案：只要 Hero 还在屏幕里，光斑就自己沿一条平滑曲线慢慢
// 游走，把隐藏层自动扫出来。
const isTouchDevice = window.matchMedia('(hover: none)').matches;

// 手指正按在屏上拖动时为 true——这会关掉下面的自动巡游，改由手指喂坐标，
// 让触屏也能像桌面端鼠标那样"手动探照"，松手后再恢复自动巡游。
let touchDriving = false;
let touchIdleTimer = null;

if (isTouchDevice) {
  const heroVisibleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        stageActive = entry.isIntersecting;
      });
    },
    { threshold: 0.25 }
  );
  heroVisibleObserver.observe(heroStage);

  // 手机上把提示文案从"move your cursor"换成贴合触屏的说法
  const catcherEl = document.querySelector('.s__catcher');
  if (catcherEl) catcherEl.textContent = 'drag to reveal';
}

function moveCursorDot(x, y) {
  cursorEl.style.setProperty('--x', `${x}px`);
  cursorEl.style.setProperty('--y', `${y}px`);
}

function renderMask() {
  // 自定义光标是 fixed 定位的，只应该在 hero-stage 范围内可见，
  // 不然滚动到别的板块后它会一直悬在屏幕上。
  cursorEl.style.opacity = stageActive ? '1' : '0';

  if (!stageActive) {
    sceneEl.style.webkitMaskImage = HIDDEN_MASK;
    sceneEl.style.maskImage = HIDDEN_MASK;
    return;
  }
  // 硬边圆，不做柔边渐变过渡。小屏幕上 260px 的光斑几乎盖满整屏，
  // 就没有"探照灯"的感觉了，按屏宽收一下。
  const radius = Math.min(SPOTLIGHT_RADIUS, heroStage.offsetWidth * 0.42);
  const maskStr = `radial-gradient(circle ${radius}px at ${current.x.toFixed(0)}px ${current.y.toFixed(0)}px, white 0%, white 99%, transparent 100%)`;
  sceneEl.style.webkitMaskImage = maskStr;
  sceneEl.style.maskImage = maskStr;
}

function tick() {
  // 触屏上没有 mousemove 喂 target：手指没在拖的时候，用时间驱动一条
  // Lissajous 曲线让光斑自己慢慢巡游；一旦手指按上来拖动，就交给触摸事件
  // 直接喂坐标（touchDriving 为 true 时跳过这段自动巡游）。
  if (isTouchDevice && stageActive && !touchDriving) {
    const t = performance.now();
    target.x = heroStage.offsetWidth * (0.5 + 0.32 * Math.cos(t * 0.00042));
    target.y = heroStage.offsetHeight * (0.44 + 0.28 * Math.sin(t * 0.00061));
  }

  current.x += (target.x - current.x) * EASE;
  current.y += (target.y - current.y) * EASE;
  moveCursorDot(current.x, current.y);
  renderMask();
  requestAnimationFrame(tick);
}

tick();

heroStage.addEventListener('mousemove', (e) => {
  const rect = heroStage.getBoundingClientRect();
  target.x = e.clientX - rect.left;
  target.y = e.clientY - rect.top;
});

heroStage.addEventListener('mouseenter', () => {
  stageActive = true;
});

heroStage.addEventListener('mouseleave', () => {
  stageActive = false;
});

// 触屏：手指在 Hero 上滑动时，光斑跟着手指走（跟桌面端鼠标一个手感）。
// 不 preventDefault——让页面照常能上下滚动，滚动手势顺带把光斑扫出来，
// 反而更灵动。松手 1.2s 后恢复自动巡游。
function feedTouch(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const rect = heroStage.getBoundingClientRect();
  target.x = touch.clientX - rect.left;
  target.y = touch.clientY - rect.top;
  stageActive = true;
  touchDriving = true;
  clearTimeout(touchIdleTimer);
}

heroStage.addEventListener('touchstart', feedTouch, { passive: true });
heroStage.addEventListener('touchmove', feedTouch, { passive: true });
heroStage.addEventListener('touchend', () => {
  // 松手后留一小段再交还给自动巡游，避免一放手光斑就"跳走"
  touchIdleTimer = setTimeout(() => { touchDriving = false; }, 1200);
}, { passive: true });


// ---------- 悬浮播放器：右下角小圆按钮，点才展开。Spotify 脚本懒加载——
// 不在页面打开时就请求 open.spotify.com（会在中国超时），等用户第一次点
// 播放按钮或 skill 卡片时才动态插入 script 标签。 ----------

const playerEl = document.querySelector('.js-player');
const playerFabEl = document.querySelector('.js-player-fab');
const playerEmbedEl = document.querySelector('.js-player-embed');
const playerTitleEl = document.querySelector('.js-player-title');
const skillTracks = document.querySelectorAll('.js-skill-track');

const DEFAULT_TRACK = {
  uri: 'spotify:track:0HPKt1krGch04gEJgzIVw6',
  title: 'Music',
};

let spotifyController = null;
let spotifyScriptLoaded = false;

// ♪ 按钮一进页面就显示，Spotify 脚本仍然懒加载（等首次点击）。
// 千万别等 Spotify 就绪才显示按钮——那样脚本永远不会加载、按钮永远不出现。
if (playerEl) {
  requestAnimationFrame(() => playerEl.classList.add('is-ready'));
}

function loadSpotifyScript() {
  if (spotifyScriptLoaded) return;
  spotifyScriptLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  document.body.appendChild(s);
}

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  IFrameAPI.createController(
    playerEmbedEl,
    { uri: DEFAULT_TRACK.uri, width: '100%', height: '80' },
    (controller) => {
      spotifyController = controller;
      playerEl.classList.add('is-ready');
    }
  );
};

function openPlayer() {
  playerEl.classList.add('is-open');
  playerFabEl.setAttribute('aria-expanded', 'true');
  if (spotifyController) spotifyController.play();
}

function closePlayer() {
  playerEl.classList.remove('is-open');
  playerFabEl.setAttribute('aria-expanded', 'false');
  if (spotifyController) spotifyController.pause();
}

playerFabEl.addEventListener('click', () => {
  loadSpotifyScript();
  if (playerEl.classList.contains('is-open')) {
    closePlayer();
  } else {
    openPlayer();
  }
});

function playSkillTrack(el) {
  loadSpotifyScript();
  const uri = el.dataset.spotifyUri;
  if (!uri) return;

  skillTracks.forEach((t) => t.classList.remove('is-playing-track'));
  el.classList.add('is-playing-track');
  playerTitleEl.textContent = el.dataset.trackTitle;

  if (spotifyController) {
    spotifyController.loadUri(uri);
    openPlayer();
  } else {
    // 脚本还没加载完，等 controller 就绪后再播
    const waitAndPlay = setInterval(() => {
      if (spotifyController) {
        clearInterval(waitAndPlay);
        spotifyController.loadUri(uri);
        openPlayer();
      }
    }, 200);
  }
}

skillTracks.forEach((el) => {
  el.addEventListener('click', () => playSkillTrack(el));
});

// ---------- Contact：复制微信号/邮箱。联系方式不写在 HTML 里，在这儿
// 用片段拼出来——爬虫批量扒静态源码时抓不到完整明文，真人点一下就复制 ----------

const CONTACT_PARTS = {
  wechat: ['sjjjj', 'yyyy', 'jszdd'],
  email: ['SJY', '2004626', '@', 'outlook.com'],
};

document.querySelectorAll('.js-copy-contact').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const value = CONTACT_PARTS[btn.dataset.kind].join('');
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // 旧浏览器/非 https 环境没有 clipboard API，退回老办法
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.classList.add('is-copied');
    setTimeout(() => btn.classList.remove('is-copied'), 1600);
  });
});

// ---------- 滚动进场动效：Projects / Skills 第一次露出时触发一次 ----------

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.closest('.js-reveal').classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2, rootMargin: '0px 0px -15% 0px' }
);

// 观察对象改成板块内真正会动的内容容器（环形头像区 / 卡片区），
// 而不是整个 min-height:100vh 的外层 section —— 之前用外层 section
// 时，section 顶部（标题文字）一露头动画就触发完了，等用户滚到真正
// 居中的内容时早就播完，等于完全看不到。
document.querySelectorAll('.js-reveal').forEach((el) => {
  const target = el.querySelector('.projects__ring, .skills__collage, .contact__inner') || el;
  revealObserver.observe(target);
});
