for (const switcher of document.querySelectorAll("[data-switcher]")) {
  const tablist = switcher.querySelector("[data-tablist]");
  const tabs = [...tablist.querySelectorAll("[data-tab]")];
  const panels = new Map(
    [...switcher.querySelectorAll("[data-panel]")].map((panel) => [panel.dataset.panel, panel]),
  );

  function showTab(selected) {
    for (const tab of tabs) {
      const active = selected === tab;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels.get(tab.dataset.tab).hidden = !active;
    }
  }

  tablist.setAttribute("role", "tablist");
  for (const tab of tabs) {
    const panel = panels.get(tab.dataset.tab);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => showTab(tab));
  }

  tablist.addEventListener("keydown", (event) => {
    const current = tabs.indexOf(event.target);
    if (current === -1) return;

    const destinations = {
      ArrowLeft: (current + tabs.length - 1) % tabs.length,
      ArrowRight: (current + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;

    event.preventDefault();
    const target = tabs[destinations[event.key]];
    showTab(target);
    target.focus();
  });

  showTab(tabs[0]);
  switcher.dataset.ready = "";
  tablist.hidden = false;
}

const cutShots = {
  opening: { file: "cut-open.webp", label: "机库全景", alt: "技师在机甲维修舱前检查松开的接口" },
  detail: { file: "cut-detail.webp", label: "接口特写", alt: "戴手套的手把蓝色接头对准机甲接口" },
  medium: { file: "cut-open.webp", label: "人物中景", alt: "拉近到人物与维修舱，观察她操作的位置", crop: true },
  working: { file: "cut-working.webp", label: "接口亮起蓝灯", alt: "接头接通，维修舱亮起蓝色信号灯" },
  alarm: { file: "cut-alarm.webp", label: "接口发出红色警报", alt: "接头还未接紧，维修舱亮起红色警报" },
};

const cutSteps = [
  {
    question: "下一镜想让观众看清什么？",
    options: [
      { label: "看接口特写", shot: "detail", note: "切到手和接口，观众能看清她正在怎样对准接头。" },
      { label: "看人物中景", shot: "medium", note: "拉近人物，保留她与维修舱的空间关系。" },
    ],
  },
  {
    question: "选择哪一个维修结果？",
    options: [
      { label: "接通 · 蓝灯亮起", shot: "working", note: "接口从断开变为亮起蓝灯，这场维修得到明确的结果。" },
      { label: "失败 · 触发红灯", shot: "alarm", note: "亮起红色警报，观众会等待她找出故障原因。" },
    ],
  },
  {
    question: "什么时候让观众看到结果？",
    options: [
      { label: "快速切换 · 3.9 秒", seconds: [1.1, 1.1, 1.7], note: "很快看到结果，动作与反馈紧接着发生。" },
      { label: "停一拍再揭晓 · 6.2 秒", seconds: [1.6, 2.4, 2.2], note: "在操作镜头多停一拍，结果出现得更晚。" },
    ],
  },
];

const cutStage = document.querySelector("[data-cut-stage]");
const cutLab = cutStage.closest(".edit-lab");
const cutUI = cutStage.querySelector("[data-cut-interaction]");
const cutQuestion = cutUI.querySelector("[data-cut-question]");
const cutFeedback = cutUI.querySelector("[data-cut-feedback]");
const cutNext = cutUI.querySelector("[data-cut-next]");
const cutReset = cutUI.querySelector("[data-cut-reset]");
const cutOptions = [...cutUI.querySelectorAll("[data-cut-option]")];
const cutStepsNav = [...cutUI.querySelectorAll("[data-step]")];
const cutMonitor = cutStage.querySelector("[data-monitor]");
const cutCaption = cutStage.querySelector("[data-monitor-caption]");
const cutMonitorState = cutStage.querySelector("[data-monitor-state]");
const cutMonitorTime = cutStage.querySelector("[data-monitor-time]");
const cutTimeline = cutLab.querySelector("[data-cut-timeline]");
const cutTotal = cutTimeline.querySelector("[data-cut-total]");
const cutClips = [...cutTimeline.querySelectorAll("[data-clip]")];
const cutOptionsPanel = cutUI.querySelector(".take-grid");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const cutSelections = [null, null, null];
let cutStepIndex = 0;
let lastUnlockedStep = 0;
let monitorIndex = 0;
let previewTimer = null;
let previewPlaying = false;
let outgoingMonitorFrame = null;

for (const file of new Set(Object.values(cutShots).map((shot) => shot.file))) {
  new Image().src = "./assets/" + file;
}

function timelineShots() {
  return ["opening", cutSteps[0].options[cutSelections[0]]?.shot, cutSteps[1].options[cutSelections[1]]?.shot];
}

function swapMonitorImage(shot) {
  const imagePath = "./assets/" + shot.file;
  const isZoomed = shot.crop === true;
  const srcChanged = cutMonitor.getAttribute("src") !== imagePath;
  if (!srcChanged && cutMonitor.classList.contains("monitor-crop") === isZoomed) return;

  outgoingMonitorFrame?.remove();
  outgoingMonitorFrame = null;
  if (!motionPreference.matches && cutMonitor.complete && cutMonitor.naturalWidth) {
    const outgoing = cutMonitor.cloneNode(false);
    outgoing.removeAttribute("data-monitor");
    outgoing.alt = "";
    outgoing.setAttribute("aria-hidden", "true");
    outgoing.classList.add("outgoing-frame");
    cutMonitor.after(outgoing);
    outgoingMonitorFrame = outgoing;

    const dissolve = () => {
      if (!outgoing.isConnected) return;
      const animation = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-out",
        fill: "forwards",
      });
      animation.finished.then(() => {
        outgoing.remove();
        if (outgoingMonitorFrame === outgoing) outgoingMonitorFrame = null;
      }, () => outgoing.remove());
    };

    if (srcChanged) cutMonitor.src = imagePath;
    cutMonitor.classList.toggle("monitor-crop", isZoomed);
    if (srcChanged) cutMonitor.decode().then(dissolve, dissolve);
    else dissolve();
    return;
  }

  if (srcChanged) cutMonitor.src = imagePath;
  cutMonitor.classList.toggle("monitor-crop", isZoomed);
}

function previewShot(index, playing = false) {
  const shot = cutShots[timelineShots()[index]];
  if (!shot) return;
  monitorIndex = index;

  swapMonitorImage(shot);
  cutMonitor.alt = shot.alt;
  cutCaption.textContent = shot.label;
  cutMonitorState.textContent = playing ? "正在放映" : "当前镜头";
  cutMonitorTime.textContent = "镜头 " + (index + 1);
  for (const [clipIndex, clip] of cutClips.entries()) {
    if (clipIndex === monitorIndex) clip.setAttribute("aria-current", "true");
    else clip.removeAttribute("aria-current");
  }
}

function renderTimeline() {
  const shots = timelineShots();
  const seconds = cutSteps[2].options[cutSelections[2]]?.seconds;
  const pending = ["", "动作镜头", "维修结果"];

  for (const [index, button] of cutClips.entries()) {
    const shot = cutShots[shots[index]];
    button.disabled = !shot;
    button.querySelector("strong").textContent = shot?.label ?? pending[index];
    button.querySelector("span").textContent = seconds ? seconds[index].toFixed(1) + " 秒" : shot ? "已入剪" : "待选择";
    if (seconds) button.style.flexGrow = seconds[index];
    else button.style.removeProperty("flex-grow");
  }

  const total = seconds?.reduce((sum, duration) => sum + duration, 0);
  cutTotal.textContent = total ? "总长 " + total.toFixed(1) + " 秒" : "已选 " + shots.filter(Boolean).length + " 个镜头";
}

function renderCutStep() {
  const step = cutSteps[cutStepIndex];
  cutQuestion.textContent = step.question;
  for (const [index, nav] of cutStepsNav.entries()) {
    nav.disabled = index > lastUnlockedStep;
    if (index === cutStepIndex) nav.setAttribute("aria-current", "step");
    else nav.removeAttribute("aria-current");
  }

  for (const [index, button] of cutOptions.entries()) {
    const option = step.options[index];
    const shot = cutShots[option.shot];
    const image = button.querySelector("img");
    const meter = button.querySelector(".rhythm-meter");
    button.setAttribute("aria-pressed", String(cutSelections[cutStepIndex] === index));
    button.querySelector("[data-option-label]").textContent = option.label;
    image.hidden = !shot;
    meter.hidden = !!shot;
    if (shot) {
      image.src = "./assets/" + shot.file;
      image.classList.toggle("take-crop", shot.crop === true);
    } else {
      meter.replaceChildren(...option.seconds.map((duration) => {
        const chunk = document.createElement("i");
        chunk.style.flexGrow = duration;
        return chunk;
      }));
    }
  }

  cutNext.disabled = cutSelections[cutStepIndex] === null;
  cutNext.textContent = previewPlaying && cutStepIndex === 2
    ? "停止放映"
    : cutStepIndex === 2 ? "放映这一版" : "下一步";
}

function stopCutPreview() {
  clearTimeout(previewTimer);
  previewTimer = null;
  previewPlaying = false;
}

function playCutPreview() {
  stopCutPreview();
  previewPlaying = true;
  const durations = cutSteps[2].options[cutSelections[2]].seconds;
  renderCutStep();

  function playClip(index) {
    previewShot(index, true);
    previewTimer = setTimeout(() => {
      if (index + 1 < durations.length) {
        playClip(index + 1);
        return;
      }
      stopCutPreview();
      renderCutStep();
      cutMonitorState.textContent = "放映结束";
    }, durations[index] * 1000);
  }

  playClip(0);
}

function visitCutStep(index) {
  stopCutPreview();
  cutStepIndex = index;
  const selected = cutSelections[index];
  cutFeedback.textContent = selected === null
    ? "选一项，在监看画面和时间线上比较变化。"
    : cutSteps[index].options[selected].note;
  renderCutStep();
  previewShot(index === 0 || cutSelections[1] === null ? 0 : 2);
  if (!motionPreference.matches) {
    cutOptionsPanel.animate(
      [{ opacity: .48, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    );
  }
  cutQuestion.focus({ preventScroll: true });
}

for (const [index, option] of cutOptions.entries()) {
  option.addEventListener("click", () => {
    stopCutPreview();
    cutSelections[cutStepIndex] = index;
    cutFeedback.textContent = cutSteps[cutStepIndex].options[index].note;
    renderTimeline();
    renderCutStep();
    if (cutStepIndex === 2) playCutPreview();
    else previewShot(cutStepIndex + 1);
  });
}

for (const [index, nav] of cutStepsNav.entries()) {
  nav.addEventListener("click", () => visitCutStep(index));
}

for (const [index, clip] of cutClips.entries()) {
  clip.addEventListener("click", () => {
    stopCutPreview();
    renderCutStep();
    previewShot(index);
  });
}

cutNext.addEventListener("click", () => {
  if (cutStepIndex < 2) {
    lastUnlockedStep = Math.max(lastUnlockedStep, cutStepIndex + 1);
    visitCutStep(cutStepIndex + 1);
  } else if (previewPlaying) {
    stopCutPreview();
    renderCutStep();
    previewShot(monitorIndex);
  } else {
    playCutPreview();
  }
});

cutReset.addEventListener("click", () => {
  cutSelections.fill(null);
  lastUnlockedStep = 0;
  renderTimeline();
  visitCutStep(0);
});

renderCutStep();
renderTimeline();
previewShot(0);
cutUI.hidden = false;
cutTimeline.hidden = false;

const immersivePanels = [...document.querySelectorAll("main > section")].slice(0, 3);
const wheelViewport = window.matchMedia("(min-width: 850px)");
const stickyHeader = document.querySelector(".top");
let turningWheelPage = false;
let wheelGestureEnd;

window.addEventListener("wheel", (event) => {
  if (!wheelViewport.matches || event.ctrlKey || event.shiftKey ||
      Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
      event.target instanceof Element && event.target.closest("input, textarea, select, .table-scroll, iframe")) return;

  if (turningWheelPage) {
    event.preventDefault();
    clearTimeout(wheelGestureEnd);
    wheelGestureEnd = setTimeout(() => { turningWheelPage = false; }, 160);
    return;
  }

  const headerHeight = stickyHeader.getBoundingClientRect().height;
  const pageLimit = window.innerHeight - headerHeight;
  const index = immersivePanels.findIndex((panel) => Math.abs(panel.getBoundingClientRect().top - headerHeight) <= 4);
  const direction = Math.sign(event.deltaY);
  const destination = immersivePanels[index + direction];
  if (index < 0 || !destination || (direction > 0 && index === immersivePanels.length - 1)) return;
  if (direction > 0 && immersivePanels[index].getBoundingClientRect().height > pageLimit + 8) return;

  event.preventDefault();
  turningWheelPage = true;
  wheelGestureEnd = setTimeout(() => { turningWheelPage = false; }, 160);
  destination.scrollIntoView({ block: "start", behavior: motionPreference.matches ? "auto" : "smooth" });
}, { passive: false });

const sceneNotes = {
  tray: "画面把饭菜和身体放在同一个景别里。机甲专业在这里被放进吃饭、工作和生活这样的日常需求中。",
  subtitle: "“抱上”借用了口语里对稳定工作的期待。这个表达让选择机甲师的动机在开场就具体可见。",
  father: "父亲的表情和比例被夸张化，家庭谈话转成了带调侃的交流，女主也多了一种看待原主执念的角度。",
  idol: "银发仍是傅星渊的辨识特征。并置在父亲的 Q 版反应旁边，他暂时成了一个可被议论的人。",
};

for (const scene of document.querySelectorAll("[data-hotspots]")) {
  const note = scene.querySelector(".point-note");
  const markers = [...scene.querySelectorAll("[data-point]")];
  for (const marker of markers) {
    marker.hidden = false;
    marker.addEventListener("click", () => {
      for (const choice of markers) {
        choice.setAttribute("aria-pressed", String(choice === marker));
      }
      note.hidden = false;
      note.textContent = sceneNotes[marker.dataset.point];
    });
  }
}

const episode = document.querySelector("[data-episode]");
const playEpisode = episode.querySelector("[data-load-episode]");
playEpisode.hidden = false;
playEpisode.addEventListener("click", () => {
  const officialPlayer = episode.querySelector("iframe");
  officialPlayer.src = episode.querySelector(".source-player").href;
  episode.querySelector(".film-cover").hidden = true;
  officialPlayer.hidden = false;
  officialPlayer.focus();
});

const audienceModel = document.querySelector("[data-audience-model]");
const continueRate = document.querySelector("#continue-rate");
const unlockRate = document.querySelector("#unlock-rate");
const audienceCount = new Intl.NumberFormat("zh-CN");

function updateAudience() {
  const continued = Math.round(1000 * continueRate.valueAsNumber / 100);
  const unlocked = Math.round(continued * unlockRate.valueAsNumber / 100);
  const continuedLabel = audienceCount.format(continued);
  const unlockedLabel = audienceCount.format(unlocked);
  document.querySelector("#continue-value").value = continueRate.value + "%";
  document.querySelector("#unlock-value").value = unlockRate.value + "%";
  document.querySelector("#continue-count").textContent = continuedLabel + " 人";
  document.querySelector("#unlock-count").textContent = unlockedLabel + " 人";
  audienceModel.querySelector(".bar-continue").style.width = continued / 10 + "%";
  audienceModel.querySelector(".bar-unlock").style.width = unlocked / 10 + "%";
  document.querySelector("#audience-result").textContent =
    "1,000 人开始观看，其中 " + continuedLabel + " 人看到解锁节点，" + unlockedLabel + " 人付费解锁。";
}

continueRate.addEventListener("input", updateAudience);
unlockRate.addEventListener("input", updateAudience);
audienceModel.hidden = false;
