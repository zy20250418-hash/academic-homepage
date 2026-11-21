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

const editNotes = {
  match: ["可以接", "深蓝工作服、黄灯和朝右的动作都延续了上一镜。景别变近，观众仍能认出她在同一个位置工作。"],
  costume: ["服装需要统一", "动作方向和维修舱的位置相近，但工作服突然变浅。两镜之间没有换衣情节，接在一起容易被看成换了人。"],
  direction: ["方向需要交代", "工作服相同，但技师从朝右变成朝左。中间加一格全景或移动镜头，可以交代她和维修舱的位置关系。"],
};

const editLab = document.querySelector("[data-edit-lab]");
const candidates = [...editLab.querySelectorAll("[data-take]")];
const editFeedback = document.querySelector("#edit-feedback");
for (const candidate of candidates) {
  candidate.addEventListener("click", () => {
    for (const take of candidates) {
      take.setAttribute("aria-pressed", String(take === candidate));
    }
    const [heading, note] = editNotes[candidate.dataset.take];
    editFeedback.querySelector("strong").textContent = heading;
    editFeedback.querySelector("span").textContent = note;
  });
}

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
