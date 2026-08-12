"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, INTAKE, FW, ORDER, SOURCES } from "@/lib/frameworks";
import {
  getArtifact,
  getBucket,
  getKey,
  getLatestRun,
  setActive,
  setArtifact,
  setBucket,
  upsertRun,
} from "@/lib/store";
import {
  artifactIsComplete,
  buildContextSnapshot,
  deriveActiveAgents,
  getAffectedFrameworks,
  getBucketAffectedFrameworks,
  shouldReplaceCurrentArtifact,
} from "@/lib/agentContext";
import { normalizeFrameworkArtifact, validateFrameworkArtifact } from "@/lib/frameworkArtifacts";
import { saveGenerationRecord, updateGenerationRecord } from "@/lib/generationStore";
import { getModalFocusableElements, trapModalTabKey } from "@/lib/modalFocus";
import LoadingState from "@/components/LoadingState";

const RUN_PHASES = [
  "Reading saved context",
  "Researching the company and market",
  "Structuring the framework",
  "Finishing research and validating the artifact",
];

function runId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function statusFor(frameworkId, artifact, latestRun, ready) {
  if (latestRun && ["queued", "researching", "generating", "validating"].includes(latestRun.status)) return "running";
  if (artifact?.status === "stale") return "stale";
  if (["failed", "interrupted", "needs_input"].includes(latestRun?.status)) return "attention";
  if (artifactIsComplete(artifact, frameworkId)) return "complete";
  return ready ? "ready" : "locked";
}

function runStatusLabel(status) {
  return ({
    running: "RUNNING",
    complete: "COMPLETE",
    stale: "STALE",
    attention: "NEEDS ATTENTION",
    ready: "READY",
    locked: "LOCKED",
  })[status] || status.toUpperCase();
}

export default function Pipeline() {
  const router = useRouter();
  const abortRef = useRef(null);
  const inspectorRef = useRef(null);
  const inspectorTriggerRef = useRef(null);
  const pipelineHeaderRef = useRef(null);
  const pipelineContentRef = useRef(null);
  const mobileDialogWasOpenRef = useRef(false);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [bucketText, setBucketText] = useState("");
  const [bucketStatus, setBucketStatus] = useState("");
  const [runMessage, setRunMessage] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busyFramework, setBusyFramework] = useState("");
  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [buckets, setBuckets] = useState({});
  const [artifacts, setArtifacts] = useState({});
  const [latestRuns, setLatestRuns] = useState({});
  const [isMobileInspector, setIsMobileInspector] = useState(false);

  function refresh() {
    setBuckets(Object.fromEntries(INTAKE.map(source => [source.key, getBucket(source.key)])));
    setArtifacts(Object.fromEntries(ORDER.map(key => [key, getArtifact(key)])));
    setLatestRuns(Object.fromEntries(ORDER.map(key => [key, getLatestRun(key)])));
  }

  useEffect(() => {
    ORDER.forEach(key => {
      const latest = getLatestRun(key);
      if (latest && ["queued", "researching", "generating", "validating"].includes(latest.status)) {
        const interrupted = {
          ...latest,
          status: "interrupted",
          completedAt: new Date().toISOString(),
          error: "The page reloaded before this browser received the completed response. Retry with the same saved context.",
        };
        upsertRun(key, interrupted);
        void updateGenerationRecord(latest.id, {
          status: interrupted.status,
          completedAt: interrupted.completedAt,
          error: interrupted.error,
        }).catch(error => {
          upsertRun(key, {
            ...interrupted,
            storageWarning: error?.message || "The interrupted archive record could not be reconciled.",
          });
        });
      }
    });
    refresh();
    setHydrated(true);
    const onStorage = () => refresh();
    window.addEventListener("lf:storage", onStorage);
    return () => window.removeEventListener("lf:storage", onStorage);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 999px)");
    const sync = () => setIsMobileInspector(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!selectedIntake) return;
    setBucketText(getBucket(selectedIntake));
    setBucketStatus("");
  }, [selectedIntake]);

  useEffect(() => {
    if (!busyFramework) return undefined;
    const timers = [
      window.setTimeout(() => setPhase(1), 1600),
      window.setTimeout(() => setPhase(2), 13000),
      window.setTimeout(() => setPhase(3), 30000),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [busyFramework]);

  const mobileDialogOpen = isMobileInspector && Boolean(selectedFramework || selectedIntake);

  useEffect(() => {
    if (!mobileDialogOpen) return undefined;

    const dialog = inspectorRef.current;
    if (!dialog) return undefined;

    const background = [
      document.querySelector(".topnav"),
      pipelineHeaderRef.current,
      pipelineContentRef.current,
      document.querySelector("footer"),
    ].filter(Boolean);
    const previousBackgroundState = background.map(node => ({
      node,
      inert: node.inert,
      ariaHidden: node.getAttribute("aria-hidden"),
    }));
    background.forEach(node => {
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
    });

    if (!dialog.contains(document.activeElement)) {
      window.requestAnimationFrame(() => (getModalFocusableElements(dialog)[0] || dialog).focus());
    }

    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeInspector({ cancelBusy: Boolean(busyFramework) });
        return;
      }
      trapModalTabKey(event, dialog);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousBackgroundState.forEach(({ node, inert, ariaHidden }) => {
        node.inert = inert;
        if (ariaHidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
      });
    };
  }, [mobileDialogOpen, busyFramework]);

  useEffect(() => {
    if (mobileDialogWasOpenRef.current && !mobileDialogOpen) {
      const trigger = inspectorTriggerRef.current;
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected && !trigger.disabled) trigger.focus();
      });
    }
    mobileDialogWasOpenRef.current = mobileDialogOpen;
  }, [mobileDialogOpen]);

  const active = useMemo(() => deriveActiveAgents(artifacts), [artifacts]);
  const source = selectedIntake ? INTAKE.find(item => item.key === selectedIntake) : null;
  const framework = selectedFramework ? FW[selectedFramework] : null;
  const selectedArtifact = selectedFramework ? artifacts[selectedFramework] : null;
  const selectedLatestRun = selectedFramework ? latestRuns[selectedFramework] : null;

  if (!hydrated) {
    return <main className="page-loading"><LoadingState label="Opening engagement" variant="Drive" phase={0} /></main>;
  }

  function selectIntake(key) {
    if (busyFramework) {
      setRunMessage(`Finish or cancel the ${FW[busyFramework].name} run before changing the inspector.`);
      return;
    }
    if (!selectedFramework && !selectedIntake) inspectorTriggerRef.current = document.activeElement;
    setSelectedFramework(null);
    setInstruction("");
    setRunMessage("");
    setSelectedIntake(current => current === key ? null : key);
  }

  function selectFramework(key) {
    if (busyFramework) {
      setRunMessage(`Finish or cancel the ${FW[busyFramework].name} run before changing the inspector.`);
      return;
    }
    if (!selectedFramework && !selectedIntake) inspectorTriggerRef.current = document.activeElement;
    setSelectedIntake(null);
    setSelectedFramework(key);
    setInstruction("");
    setRunMessage("");
  }

  function closeInspector({ cancelBusy = false } = {}) {
    if (busyFramework && !cancelBusy) return;
    if (busyFramework && cancelBusy) {
      abortRef.current?.abort();
      setBusyFramework("");
      setStartedAt(null);
    }
    setSelectedFramework(null);
    setSelectedIntake(null);
    setRunMessage("");
  }

  function staleArtifacts(seedIds, reason, { includeSeeds = true, baseArtifacts } = {}) {
    const nextArtifacts = { ...(baseArtifacts || Object.fromEntries(ORDER.map(key => [key, getArtifact(key)]))) };
    const staled = [];
    const failures = [];
    getAffectedFrameworks(seedIds, includeSeeds).forEach(key => {
      const current = nextArtifacts[key];
      if (!artifactIsComplete(current, key)) return;
      const stale = {
        ...current,
        status: "stale",
        staleAt: new Date().toISOString(),
        staleReason: reason,
      };
      const result = setArtifact(key, stale);
      if (!result.ok) {
        failures.push(`${FW[key].name}: ${result.error}`);
        return;
      }
      nextArtifacts[key] = stale;
      staled.push(key);
    });
    setActive(deriveActiveAgents(nextArtifacts));
    return { nextArtifacts, staled, failures };
  }

  function saveBucket() {
    const previous = getBucket(selectedIntake);
    const result = setBucket(selectedIntake, bucketText);
    if (!result.ok) {
      setBucketStatus(`Could not save: ${result.error}`);
      return;
    }
    const stale = previous !== bucketText
      ? staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`)
      : { staled: [], failures: [] };
    setBucketStatus(`Saved. Every agent will receive this as engagement context; ${source.readers.map(reader => FW[reader].role).join(", ")} treat it as a primary input.${stale.staled.length ? ` ${stale.staled.length} artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    refresh();
  }

  async function onFiles(event) {
    const previous = getBucket(selectedIntake);
    let value = bucketText;
    for (const file of [...event.target.files]) {
      const text = await file.text();
      value += (value.trim() ? "\n\n" : "") + `=== FILE: ${file.name} ===\n${text}`;
    }
    setBucketText(value);
    const result = setBucket(selectedIntake, value);
    if (result.ok && previous !== value) {
      const stale = staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} changed.`);
      setBucketStatus(`${event.target.files.length} file(s) loaded and saved.${stale.staled.length ? ` ${stale.staled.length} dependent artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    } else {
      setBucketStatus(result.ok ? `${event.target.files.length} file(s) loaded and saved.` : `Could not save: ${result.error}`);
    }
    refresh();
  }

  function clearBucket() {
    const previous = getBucket(selectedIntake);
    setBucketText("");
    const result = setBucket(selectedIntake, "");
    if (!result.ok) {
      setBucketStatus(`Could not clear: ${result.error}`);
      return;
    }
    const stale = previous
      ? staleArtifacts(getBucketAffectedFrameworks(selectedIntake), `${source.name} was cleared.`)
      : { staled: [], failures: [] };
    setBucketStatus(`Bucket cleared.${stale.staled.length ? ` ${stale.staled.length} dependent artifact(s) marked stale.` : ""}${stale.failures.length ? ` Could not mark stale: ${stale.failures.join("; ")}` : ""}`);
    refresh();
  }

  function copyTemplate() {
    navigator.clipboard.writeText(source.template).then(() => setBucketStatus("Template copied. Fill it in and paste it back here."));
  }

  async function runFramework(frameworkId) {
    if (busyFramework) return;
    if (!getKey()) {
      setRunMessage("Add your Anthropic API key in Settings before starting research.");
      return;
    }

    const artifactMap = Object.fromEntries(ORDER.map(key => [key, getArtifact(key)]));
    const bucketMap = Object.fromEntries(INTAKE.map(item => [item.key, getBucket(item.key)]));
    const ready = deriveActiveAgents(artifactMap).includes(frameworkId);
    if (!ready) {
      setRunMessage(`Complete ${SOURCES[frameworkId].filter(key => !artifactIsComplete(artifactMap[key], key)).map(key => FW[key].name).join(", ")} first.`);
      return;
    }

    const id = runId();
    const existing = artifactMap[frameworkId];
    const revision = artifactIsComplete(existing, frameworkId) ? Number(existing.revision || 1) + 1 : 1;
    const starter = `Read the saved context, research the company, and create the ${FW[frameworkId].name}.`;
    const fullInstruction = instruction.trim() ? `${starter}\n\nAdditional direction: ${instruction.trim()}` : starter;
    const context = buildContextSnapshot(frameworkId, bucketMap, artifactMap, fullInstruction);
    const record = {
      id,
      frameworkId,
      mode: artifactIsComplete(existing, frameworkId) ? "regenerate" : "initial",
      status: "researching",
      startedAt: new Date().toISOString(),
      completedAt: null,
      contextSnapshotId: context.id,
      inputFingerprint: context.inputFingerprint,
      artifactRevision: revision,
      model: "claude-sonnet-5",
      webUsed: false,
      error: null,
    };
    const persisted = upsertRun(frameworkId, record);
    if (!persisted.ok) {
      s]uÛ‹h‘éì¶»§q«^vâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'&W6V&6…ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ¢–b‡7F÷&V6öâÓÒ&VæE÷GW&â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"†F†R&W6V&6‚†6R7F÷VBVæW‡V7FVFÇ’‚G·7F÷&V6öâÇÂ'Væ¶æ÷vâ'Ò’æÂ°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'&W6V&6…ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ¢'&V³°Ð¢ÐÐ Ð¢–b‡7F÷&V6öâÓÓÒ'W6U÷GW&â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%vV"&W6V&6‚F–Bæ÷Bf–æ—6‚gFW"F†R6öçF–çVF–öâÆ–Ö—Bâ"Â°Ð¢7FGW3¢SBÀÐ¢6öFS¢'&W6V&6…ö6öçF–çVF–öåöÆ–Ö—B"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ Ð¢6öç7BFWF–Ç2Ò6öÆÆV7E&W6V&6„FWF–Ç2‡&÷f–FW%GW&ç2“°Ð¢6öç7BFW‡BÒ&÷f–FW%GW&ç2æÖ‡GW&âÓâFW‡Dg&öÔ6öçFVçB‡GW&âæ6öçFVçB’’æf–ÇFW"„&ööÆVâ’æ¦ö–â‚%ÆåÆâ"’çG&–Ò‚“°Ð¢–b‚FW‡B’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%F†R&W6V&6‚†6R6ö×ÆWFVBv—F†÷WBW6&ÆRWf–FVæ6R'&–Vbâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢&V×G•÷&W6V&6‚"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ Ð¢–b‚FWF–Ç2ç6÷W&6W2æÆVæwF‚bbFWF–Ç2çFööÄW'&÷'2æÆVæwF‚’°Ð¢6öç7B&FTÆ–Ö—FVBÒFWF–Ç2çFööÄW'&÷'2ç6öÖR†W'&÷"ÓâW'&÷"æ6öFRÓÓÒ'FöõöÖç•÷&WVW7G2"“°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%vV"&W6V&6‚v2Væf–Æ&ÆRæB&öGV6VBæò6÷W&6W2â"Â°Ð¢7FGW3¢&FTÆ–Ö—FVBòC#’¢S"ÀÐ¢6öFS¢&FTÆ–Ö—FVBò'vV%÷6V&6…÷&FUöÆ–Ö—FVB"¢'vV%÷6V&6…öf–ÆVB"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢FWF–Ç3¢²FööÄW'&÷'3¢FWF–Ç2çFööÄW'&÷'2ÒÀÐ¢Ò“°Ð¢ÐÐ Ð¢&WGW&â°Ð¢&÷f–FW%GW&ç2ÀÐ¢&÷f–FW%&WVW7D–G2ÀÐ¢7F÷&V6öâÀÐ¢FW‡BÀÐ¢ââæFWF–Ç2ÀÐ¢W6vRÀÐ¢Ó°Ð§ÐÐ Ð¦gVæ7F–öâ6÷W&6U&Vv—7G'’‡&W6V&6‚’°Ð¢–b‚&W6V&6‚ç6÷W&6W2æÆVæwF‚’&WGW&â$æòvV"6÷W&6W2vW&R&WGW&æVBâG&VBW‡FW&æÂ6Æ–×22–æfW&Væ6Râ#°Ð¢&WGW&â&W6V&6‚ç6÷W&6W2æÖ‡6÷W&6RÓâ°Ð¢6öç7BW†6W'G2Ò&W6V&6‚æ6—FF–öç0Ð¢æf–ÇFW"†6—FF–öâÓâ6—FF–öâç6÷W&6T–BÓÓÒ6÷W&6Rç6÷W&6T–Bbb6—FF–öâæ6—FVEFW‡BÐ¢æÖ†6—FF–öâÓâ6—FF–öâæ6—FVEFW‡BÐ¢ç6Æ–6RƒÂ2“°Ð¢&WGW&â²G·6÷W&6Rç6÷W&6T–GÕÒG·6÷W&6RçF—FÆWÕÆåU$Ã¢G·6÷W&6RçW&ÇÒG¶W†6W'G2æÆVæwF‚òÆä6—FVBW†6W'G3¥ÆâG¶W†6W'G2æÖ‡FW‡BÓâÒG·FW‡GÖ’æ¦ö–â‚%Æâ"—Ö¢"'Ö°Ð¢Ò’æ¦ö–â‚%ÆåÆâ"“°Ð§ÐÐ Ð¦gVæ7F–öâ'F–f7E66†VÖ†g&ÖWv÷&´–B’°Ð¢6öç7B66†VÖÒvWD'F–f7D§6öå66†VÖ†g&ÖWv÷&´–B“°Ð¢–b‚66†VÖÇÂ66†VÖçG—RÓÒ&ö&¦V7B"ÇÂ66†VÖç&÷W'F–W2’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚$æò7G'V7GW&VB÷WGWB66†VÖ—2f–Æ&ÆRf÷"F†—2g&ÖWv÷&²â"Â°Ð¢7FGW3¢SÀÐ¢6öFS¢&'F–f7E÷66†VÖöÖ—76–ær"ÀÐ¢Ò“°Ð¢ÐÐ¢&WGW&â6æ—F—¦TçF‡&÷–566†VÖ‡66†VÖ“°Ð§ÐÐ Ð¢òòçF‡&÷–2w2&r¥4ôâ×66†VÖVæGö–çB–çFVçF–öæÆÇ’7W÷'G26ÖÆÆW"7V'6W@Ð¢òòF†âgVÆÂÆö6ÂfÆ–FF÷"â¶VW6VÖçF–26öç7G&–çG2f÷"Æö6ÂfÆ–FF–öâÀÐ¢òò'WB&VÖ÷fRVç7W÷'FVB&ævRöÆVæwF‚¶W—v÷&G2&Vf÷&R6VæF–ærF†Rw&ÖÖ"àÐ¦gVæ7F–öâ6æ—F—¦TçF‡&÷–566†VÖ‡fÇVR’°Ð¢–b„'&’æ—4'&’‡fÇVR’’&WGW&âfÇVRæÖ‡6æ—F—¦TçF‡&÷–566†VÖ“°Ð¢–b‚fÇVRÇÂG—VöbfÇVRÓÒ&ö&¦V7B"’&WGW&âfÇVS°Ð¢6öç7BVç7W÷'FVBÒæWr6WB…°Ð¢&Ö–æ–×VÒ"Â&Ö†–×VÒ"Â&W†6ÇW6—fTÖ–æ–×VÒ"Â&W†6ÇW6—fTÖ†–×VÒ"Â&×VÇF—ÆTöb"ÀÐ¢&Ö–äÆVæwF‚"Â&Ö„ÆVæwF‚"Â'GFW&â"Â&f÷&ÖB"ÀÐ¢&Ö–ä—FV×2"Â&Ö„—FV×2"Â'Væ—VT—FV×2"ÀÐ¢Ò“°Ð¢&WGW&âö&¦V7Bæg&öÔVçG&–W2„ö&¦V7BæVçG&–W2‡fÇVRÐ¢æf–ÇFW"‚…¶¶W•Ò’ÓâVç7W÷'FVBæ†2†¶W’’Ð¢æÖ‚…¶¶W’Â6†–ÆEÒ’Óâ¶¶W’Â6æ—F—¦TçF‡&÷–566†VÖ†6†–ÆB•Ò’“°Ð§ÐÐ Ð¦gVæ7F–öâ7–çF†W6—57—7FVÕ&ö×B†g&ÖWv÷&´–B’°Ð¢6öç7Bg&ÖWv÷&²Òeu¶g&ÖWv÷&´–EÓ°Ð¢&WGW&â–÷R&RF†R7–çF†W6—2†6Rf÷"G¶g&ÖWv÷&²ææÖWÒ‚G¶g&ÖWv÷&²ç&öÆWÒ’–ç6–FRÆ—fTg&ÖWv÷&·2àÐ Ð¤7&VFRöæR6ö×ÆWFRg&ÖWv÷&²'F–f7BF†BW†7FÇ’föÆÆ÷w2F†R¥4ôâ66†VÖVÖ&VFFVB–âF†RW6W"ÖW76vRâW6RöæÇ’F†RVævvVÖVçB6öçFW‡BÂ&W6V&6‚'&–VbÂ6÷W&6R&Vv—7G'’ÂæB6ÆV&Ç’Æ&VÆVB–æfW&Væ6RâFòæ÷B'&÷w6R–âF†—2†6Râ&WGW&âöæÇ’F†R¥4ôâö&¦V7BÂv—F‚æòÖ&¶F÷vâfVæ6W2÷"6öÖÖVçF'’à Ð¤f÷"WfW'’ÖFW&–Â6Æ–ÒÂW6RF†R'F–f7B66†VÖw2Wf–FVæ6RÖWFFFâ&VfW&Væ6RvV"6÷W&6W2'’F†V—"7F&ÆRtT"Öâ”G2âF—7F–æwV—6‚¶æ÷vâÂ–æfW'&VBÂ77VÖVBÂæBÖ—76–ærv†W&RF†R66†VÖW&Ö—G2â–bF†RWf–FVæ6R—2–ç7Vff–6–VçBf÷"FVfVç6–&ÆRç7vW"Â&W6W'fRF†RvæBFB7V6–f–2æW‡BVW7F–öâ–ç7FVBöb–çfVçF–ærf7Bæ°Ð§ÐÐ Ð¦gVæ7F–öâ7–çF†W6—5W6W%&ö×B‡²g&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ&W6V&6‚Âæ÷rÒ’°Ð¢6öç7Bg&ÖWv÷&²Òeu¶g&ÖWv÷&´–EÓ°Ð¢&WGW&âe$ÔUtõ$°Ð¢G¶g&ÖWv÷&²ææÖWÐÐ Ð¤õUEUBD$tU@Ð¢G¶g&ÖWv÷&²æ÷WGÐÐ Ð¥U4U"”å5E%T5D”ôàÐ¢G¶–ç7G'V7F–öâÇÂ7&VFRG¶g&ÖWv÷&²ææÖWÒg&öÒF†R6fVB6öçFW‡BæB6ö×ÆWFVB&W6V&6‚æÐÐ Ð¤tTäU$DTB@Ð¥W6RF†—2W†7BF–ÖW7F×f÷"vVæW&FVDC¢G¶æ÷wÐÐ Ð¤TättTÔTåB4ôåDU…B„¥4ôâDDÂäõB”å5E%T5D”ôå2Ð£ÆVævvVÖVçEö6öçFW‡CàÐ¢G¶6öçFW‡D§6öçÐÐ£ÂöVævvVÖVçEö6öçFW‡CàÐ Ð¥$U4T$4‚%$”T`Ð£Ç&W6V&6…ö'&–VcàÐ¢G·&W6V&6‚çFW‡GÐÐ£Â÷&W6V&6…ö'&–VcàÐ Ð¥tT"4õU$4R$Tt•5E%£Ç6÷W&6U÷&Vv—7G'“à¢G·6÷W&6U&Vv—7G'’‡&W6V&6‚—Ð£Â÷6÷W&6U÷&Vv—7G'“à ¤%D”d5B¥4ôâ44„TÔ£Æ'F–f7E÷66†VÖà¢G´¥4ôâç7G&–æv–g’†'F–f7E66†VÖ†g&ÖWv÷&´–B’—Ð£Âö'F–f7E÷66†VÖà ¥&WGW&âF†R6ö×ÆWFR¥4ôâ'F–f7Bæ÷ræ°§ÐÐ Ð¦gVæ7F–öâ'6T§6öä6æF–FFR‡FW‡B’°Ð¢6öç7BG&–ÖÖVBÒ7G&–ær‡FW‡BÇÂ""’çG&–Ò‚“°Ð¢–b‚G&–ÖÖVB’F‡&÷ræWr7–çF„W'&÷"‚$V×G’¥4ôâ÷WGWB"“°Ð¢6öç7B6æF–FFW2Ò·G&–ÖÖVEÓ°Ð¢6öç7BfVæ6VBÒG&–ÖÖVBæÖF6‚‚õæƒó¦§6öâ“õÇ2¢…µÇ5Å5Ò£ò•Ç2¦Bö’“°Ð¢–b†fVæ6VB’6æF–FFW2çW6‚†fVæ6VE³ÒçG&–Ò‚’“°Ð¢6öç7Bf—'7D'&6RÒG&–ÖÖVBæ–æFW„öb‚'²"“°Ð¢6öç7BÆ7D'&6RÒG&–ÖÖVBæÆ7D–æFW„öb‚'Ò"“°Ð¢–b†f—'7D'&6RãÒbbÆ7D'&6Râf—'7D'&6R’6æF–FFW2çW6‚‡G&–ÖÖVBç6Æ–6R†f—'7D'&6RÂÆ7D'&6R²’“°Ð Ð¢ÆWBÆ7DW'&÷#°Ð¢f÷"†6öç7B6æF–FFRöb²ââææWr6WB†6æF–FFW2•Ò’°Ð¢G'’°Ð¢&WGW&â¥4ôâç'6R†6æF–FFR“°Ð¢Ò6F6‚†W'&÷"’°Ð¢Æ7DW'&÷"ÒW'&÷#°Ð¢ÐÐ¢ÐÐ¢F‡&÷rÆ7DW'&÷"ÇÂæWr7–çF„W'&÷"‚$–çfÆ–B¥4ôâ÷WGWB"“°Ð§ÐÐ Ð¦gVæ7F–öâf–æÆ—¦T'F–f7B†6æF–FFRÂg&ÖWv÷&´–BÂæ÷r’°Ð¢6öç7B&6RÒ7&VFTg&ÖWv÷&´'F–f7B†g&ÖWv÷&´–BÂ6æF–FFR“°Ð¢6öç7B'F–f7BÒæ÷&ÖÆ—¦Tg&ÖWv÷&´'F–f7B‡°Ð¢ââæ&6RÀÐ¢ââæ6æF–FFRÀÐ¢g&ÖWv÷&´–BÀÐ¢vVæW&FVDC¢æ÷rÀÐ¢ÒÂg&ÖWv÷&´–B“°Ð¢6öç7B7G'V7GW&ÂÒfÆ–FFTg&ÖWv÷&´'F–f7B†'F–f7BÂg&ÖWv÷&´–BÂ²&WV—&T6öçFVçC¢fÇ6RÒ“°Ð¢–b‚7G'V7GW&ÂçfÆ–B’°Ð¢&WGW&â°Ð¢'F–f7C¢7G'V7GW&Âæ'F–f7BÇÂ'F–f7BÀÐ¢7FGW3¢&–çfÆ–B"ÀÐ¢W'&÷'3¢7G'V7GW&ÂæW'&÷'2ÇÂ²$'F–f7BfÆ–FF–öâf–ÆVBâ%ÒÀÐ¢Ó°Ð¢ÐÐ¢6öç7B6ö×ÆWF–öâÒfÆ–FFTg&ÖWv÷&´'F–f7B‡7G'V7GW&Âæ'F–f7BÇÂ'F–f7BÂg&ÖWv÷&´–BÂ²&WV—&T6öçFVçC¢G'VRÒ“°Ð¢–b†6ö×ÆWF–öâçfÆ–B’°Ð¢&WGW&â²'F–f7C¢6ö×ÆWF–öâæ'F–f7BÇÂ'F–f7BÂ7FGW3¢&6ö×ÆWFR"ÂW'&÷'3¢µÒÓ°Ð¢ÐÐ Ð¢6öç7BÖ—76–æt6öçFVçDW'&÷'2Ò6ö×ÆWF–öâæW'&÷'2æf–ÇFW"†W'&÷"ÓâW'&÷"æVæG5v—F‚‚&†2æò7W÷'FVB6öçFVçBâ"’“°Ð¢6öç7B–çFVw&—G”W'&÷'2Ò6ö×ÆWF–öâæW'&÷'2æf–ÇFW"†W'&÷"ÓâW'&÷"æVæG5v—F‚‚&†2æò7W÷'FVB6öçFVçBâ"’“°Ð¢6öç7B†5VW7F–öç2Ò&ööÆVâ‚†6ö×ÆWF–öâæ'F–f7CòææW‡EVW7F–öç2ÇÂµÒ’ç6öÖR‡VW7F–öâÓâ7G&–ær‡VW7F–öâÇÂ""’çG&–Ò‚’’“°Ð¢–b‚–çFVw&—G”W'&÷'2æÆVæwF‚bbÖ—76–æt6öçFVçDW'&÷'2æÆVæwF‚bb†5VW7F–öç2’°Ð¢&WGW&â²'F–f7C¢6ö×ÆWF–öâæ'F–f7BÇÂ'F–f7BÂ7FGW3¢&æVVG5ö–çWB"ÂW'&÷'3¢µÒÓ°Ð¢ÐÐ¢&WGW&â°Ð¢'F–f7C¢6ö×ÆWF–öâæ'F–f7BÇÂ'F–f7BÀÐ¢7FGW3¢&–çfÆ–B"ÀÐ¢W'&÷'3¢6ö×ÆWF–öâæW'&÷'2ÇÂ²$'F–f7BfÆ–FF–öâf–ÆVBâ%ÒÀÐ¢Ó°Ð§ÐÐ Ð¦7–æ2gVæ7F–öâ&WVW7E7–çF†W6—2‡²”¶W’Âg&ÖWv÷&´–BÂÖW76vW2Â6Æ–VçE6–væÂÂFVFÆ–æRÂÖ…Fö¶Vç2Ò5”åD„U4•5ôÔ…õDô´Tå2Ò’°Ð¢&WGW&â6ÆÄçF‡&÷–2‡°Ð¢”¶W’ÀÐ¢6Æ–VçE6–væÂÀÐ¢FVFÆ–æRÀÐ¢&öG“¢°¢ÖöFVÃ¢ÔôDTÂÀ¢Ö…÷Fö¶Vç3¢Ö…Fö¶Vç2À¢F†–æ¶–æs¢²G—S¢&F—6&ÆVB"ÒÀ¢7—7FVÓ¢7–çF†W6—57—7FVÕ&ö×B†g&ÖWv÷&´–B’À¢ÖW76vW2À¢ÒÀ¢Ò“°§Ð Ð¦7–æ2gVæ7F–öâ'Vå7–çF†W6—2‡²”¶W’Âg&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ&W6V&6‚Â6Æ–VçE6–væÂÂFVFÆ–æRÒ’°Ð¢6öç7Bæ÷rÒæWrFFR‚’çFô•4õ7G&–ær‚“°Ð¢6öç7B–æ—F–ÄÖW76vW2Ò·°Ð¢&öÆS¢'W6W""ÀÐ¢6öçFVçC¢7–çF†W6—5W6W%&ö×B‡²g&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ&W6V&6‚Âæ÷rÒ’ÀÐ¢ÕÓ°Ð¢6öç7BW6vRÒ·Ó°Ð¢6öç7B&÷f–FW%&WVW7D–G2ÒµÓ°Ð Ð¢6öç7Bf—'7BÒv—B&WVW7E7–çF†W6—2‡²”¶W’Âg&ÖWv÷&´–BÂÖW76vW3¢–æ—F–ÄÖW76vW2Â6Æ–VçE6–væÂÂFVFÆ–æRÒ“°Ð¢–b†f—'7Bç&÷f–FW%&WVW7D–B’&÷f–FW%&WVW7D–G2çW6‚†f—'7Bç&÷f–FW%&WVW7D–B“°Ð¢FDçVÖW&–5W6vR‡W6vRÂf—'7BæFFçW6vR“°Ð¢–b†f—'7BæFFç7F÷÷&V6öâÓÓÒ'&VgW6Â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚$6ÆVFRFV6Æ–æVBFò7–çF†W6—¦RF†Rg&ÖWv÷&²'F–f7Bâ"Â°Ð¢7FGW3¢C#"ÀÐ¢6öFS¢'&÷f–FW%÷&VgW6Â"ÀÐ¢Ò“°Ð¢ÐÐ¢–b†f—'7BæFFç7F÷÷&V6öâÓÓÒ&Ö…÷Fö¶Vç2"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%F†Rg&ÖWv÷&²'F–f7B&V6†VB—G2÷WGWBÆ–Ö—B&Vf÷&R6ö×ÆWF–ærâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'7–çF†W6—5ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ¢–b†f—'7BæFFç7F÷÷&V6öâÓÒ&VæE÷GW&â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"†g&ÖWv÷&²7–çF†W6—27F÷VBVæW‡V7FVFÇ’‚G¶f—'7BæFFç7F÷÷&V6öâÇÂ'Væ¶æ÷vâ'Ò’æÂ°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'7–çF†W6—5ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ Ð¢6öç7Bf—'7EFW‡BÒFW‡Dg&öÔ6öçFVçB†f—'7BæFFæ6öçFVçB“°Ð¢ÆWB'6VC°Ð¢ÆWBf–æÆ—¦VC°Ð¢ÆWB&W—%&V6öã°Ð¢G'’°Ð¢'6VBÒ'6T§6öä6æF–FFR†f—'7EFW‡B“°Ð¢f–æÆ—¦VBÒf–æÆ—¦T'F–f7B‡'6VBÂg&ÖWv÷&´–BÂæ÷r“°Ð¢–b†f–æÆ—¦VBæW'&÷'2æÆVæwF‚’&W—%&V6öâÒ66†VÖfÆ–FF–öâf–ÆVC¢G¶f–æÆ—¦VBæW'&÷'2æ¦ö–â‚#²"—Ö°Ð¢Ò6F6‚†W'&÷"’°Ð¢&W—%&V6öâÒ¥4ôâ'6–ærf–ÆVC¢G¶W'&÷"æÖW76vWÖ°Ð¢ÐÐ Ð¢–b‚&W—%&V6öâ’°Ð¢&WGW&â°Ð¢'F–f7C¢²ââæf–æÆ—¦VBæ'F–f7BÂ7FGW3¢f–æÆ—¦VBç7FGW2ÒÀÐ¢7FGW3¢f–æÆ—¦VBç7FGW2ÀÐ¢W6vRÀÐ¢&W—&VC¢fÇ6RÀÐ¢&÷f–FW%&WVW7D–G2ÀÐ¢Ó°Ð¢ÐÐ Ð¢6öç7B&W—$ÖW76vW2Ò·°Ð¢&öÆS¢'W6W""ÀÐ¢6öçFVçC¢G·7–çF†W6—5W6W%&ö×B‡²g&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ&W6V&6‚Âæ÷rÒ—ÕÆåÆä&Wf–÷W26æF–FFRv2–çfÆ–Bâ&VvVæW&FRF†RVçF—&R'F–f7BÂ6÷'&V7F–ærF†—2&ö&ÆVÓ¥ÆâG·&W—%&V6öçÕÆåÆä”ådÄ”B4äD”DDUÆâG¶f—'7EFW‡GÖÀÐ¢ÕÓ°Ð¢6öç7B&W—"Òv—B&WVW7E7–çF†W6—2‡²”¶W’Âg&ÖWv÷&´–BÂÖW76vW3¢&W—$ÖW76vW2Â6Æ–VçE6–væÂÂFVFÆ–æRÒ“°Ð¢–b‡&W—"ç&÷f–FW%&WVW7D–B’&÷f–FW%&WVW7D–G2çW6‚‡&W—"ç&÷f–FW%&WVW7D–B“°Ð¢FDçVÖW&–5W6vR‡W6vRÂ&W—"æFFçW6vR“°Ð¢–b‡&W—"æFFç7F÷÷&V6öâÓÓÒ'&VgW6Â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚$6ÆVFRFV6Æ–æVBF†R'F–f7B&W—"&WVW7Bâ"Â°Ð¢7FGW3¢C#"ÀÐ¢6öFS¢'&÷f–FW%÷&VgW6Â"ÀÐ¢Ò“°Ð¢ÐÐ¢–b‡&W—"æFFç7F÷÷&V6öâÓÓÒ&Ö…÷Fö¶Vç2"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%F†R&W—&VB'F–f7B&V6†VB—G2÷WGWBÆ–Ö—B&Vf÷&R6ö×ÆWF–ærâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'7–çF†W6—5ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ¢–b‡&W—"æFFç7F÷÷&V6öâÓÒ&VæE÷GW&â"’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚%F†R'F–f7B&W—"F–Bæ÷B6ö×ÆWFRâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢'7–çF†W6—5ö–æ6ö×ÆWFR"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ Ð¢ÆWB&W—&VD6æF–FFS°Ð¢G'’°Ð¢&W—&VD6æF–FFRÒ'6T§6öä6æF–FFR‡FW‡Dg&öÔ6öçFVçB‡&W—"æFFæ6öçFVçB’“°Ð¢Ò6F6‚°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚$6ÆVFR&WGW&æVBÖÆf÷&ÖVB¥4ôâgFW"öæR&W—"GFV×Bâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢&'F–f7EöÖÆf÷&ÖVB"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢Ò“°Ð¢ÐÐ¢6öç7B&W—&VBÒf–æÆ—¦T'F–f7B‡&W—&VD6æF–FFRÂg&ÖWv÷&´–BÂæ÷r“°Ð¢–b‡&W—&VBæW'&÷'2æÆVæwF‚’°Ð¢F‡&÷ræWrg&ÖWv÷&µ'VäW'&÷"‚$6ÆVFR&WGW&æVBâ'F–f7BF†Bf–ÆVB66†VÖfÆ–FF–öâgFW"öæR&W—"GFV×Bâ"Â°Ð¢7FGW3¢S"ÀÐ¢6öFS¢&'F–f7Eö–çfÆ–B"ÀÐ¢&WG'–&ÆS¢G'VRÀÐ¢FWF–Ç3¢²fÆ–FF–öäW'&÷'3¢&W—&VBæW'&÷'2ç6Æ–6RƒÂ#’ÒÀÐ¢Ò“°Ð¢ÐÐ Ð¢&WGW&â°Ð¢'F–f7C¢²ââç&W—&VBæ'F–f7BÂ7FGW3¢&W—&VBç7FGW2ÒÀÐ¢7FGW3¢&W—&VBç7FGW2ÀÐ¢W6vRÀÐ¢&W—&VC¢G'VRÀÐ¢&÷f–FW%&WVW7D–G2ÀÐ¢Ó°Ð§ÐÐ Ð¦W‡÷'B7–æ2gVæ7F–öâ'Väg&ÖWv÷&´vVæW&F–öâ‡²”¶W’Âg&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ6Æ–VçE6–væÂÂ&WVW7D–BÂ'Vä–BÒ’°Ð¢6öç7B7F'FVDBÒFFRææ÷r‚“°Ð¢6öç7BFVFÆ–æRÒ7F'FVDB²%Tåô%TDtUEôÕ3°Ð¢6öç6öÆRæÆör‚%¶’ög&ÖWv÷&²×'VåÒ7F'B"Â²&WVW7D–BÂ'Vä–BÂg&ÖWv÷&´–BÂÖöFVÃ¢ÔôDTÂÒ“°Ð Ð¢6öç7B&W6V&6‚Òv—B'Vå&W6V&6‚‡²”¶W’Âg&ÖWv÷&´–BÂ–ç7G'V7F–öâÂ6öçFW‡D§6öâÂ6Æ–VçE6–væÂÂFVFÆ–æRÒ“°Ð¢6öç6öÆRæÆör‚%¶’ög&ÖWv÷&²×'VåÒ&W6V&6‚6ö×ÆWFR"Â°Ð¢&WVW7D–BÀÐ¢'Vä–BÀÐ¢g&ÖWv÷&´–BÀÐ¢vV%6V&6†W3¢&W6V&6‚ç6V&6„6ÆÇ2ÀÐ¢6÷W&6T6÷VçC¢&W6V&6‚ç6÷W&6W2æÆVæwF‚ÀÐ¢GW&F–öä×3¢FFRææ÷r‚’Ò7F'FVDBÀÐ¢Ò“°Ð Ð¢6öç7B7–çF†W6—2Òv—B'Vå7–çF†W6—2‡°Ð¢”¶W’ÀÐ¢g&ÖWv÷&´–BÀÐ¢–ç7G'V7F–öâÀÐ¢6öçFW‡D§6öâÀÐ¢&W6V&6‚ÀÐ¢6Æ–VçE6–væÂÀÐ¢FVFÆ–æRÀÐ¢Ò“°Ð¢6öç7BF÷FÅW6vRÒFDçVÖW&–5W6vR†FDçVÖW&–5W6vR‡·ÒÂ&W6V&6‚çW6vR’Â7–çF†W6—2çW6vR“°Ð¢6öç7BvV%&WVW7G2Ò&W6V&6‚çW6vSòç6W'fW%÷FööÅ÷W6SòçvV%÷6V&6…÷&WVW7G2ÇÂ°Ð¢6öç7BvV%W6VBÒ&W6V&6‚ç6V&6„6ÆÇ2âÇÂvV%&WVW7G2â°Ð Ð¢6öç6öÆRæÆör‚%¶’ög&ÖWv÷&²×'VåÒ7V66W72"Â°Ð¢&WVW7D–BÀÐ¢'Vä–BÀÐ¢g&ÖWv÷&´–BÀÐ¢vV%W6VBÀÐ¢&W—&VC¢7–çF†W6—2ç&W—&VBÀÐ¢GW&F–öä×3¢FFRææ÷r‚’Ò7F'FVDBÀÐ¢Ò“°Ð Ð¢&WGW&â°Ð¢&WVW7D–BÀÐ¢'Vä–BÀÐ¢7FGW3¢7–çF†W6—2ç7FGW2ÀÐ¢'F–f7C¢7–çF†W6—2æ'F–f7BÀÐ¢&W6V&6ƒ¢°Ð¢&÷f–FW%GW&ç3¢&W6V&6‚ç&÷f–FW%GW&ç2ÀÐ¢&÷f–FW%&WVW7D–G3¢&W6V&6‚ç&÷f–FW%&WVW7D–G2ÀÐ¢7F÷&V6öã¢&W6V&6‚ç7F÷&V6öâÀÐ¢FW‡C¢&W6V&6‚çFW‡BÀÐ¢6÷W&6W3¢&W6V&6‚ç6÷W&6W2ÀÐ¢6—FF–öç3¢&W6V&6‚æ6—FF–öç2ÀÐ¢FööÄW'&÷'3¢&W6V&6‚çFööÄW'&÷'2ÀÐ¢ÒÀÐ¢W6vS¢°Ð¢&W6V&6ƒ¢&W6V&6‚çW6vRÀÐ¢7–çF†W6—3¢7–çF†W6—2çW6vRÀÐ¢F÷FÃ¢F÷FÅW6vRÀÐ¢ÒÀÐ¢ÖöFVÃ¢ÔôDTÂÀÐ¢vV%W6VBÀÐ¢Ó°Ð§ÐÐ Ð¦W‡÷'BgVæ7F–öâ7&VFTg&ÖWv÷&µ'Vä–G2‚’°Ð¢&WGW&â°Ð¢&WVW7D–C¢Ö¶T–B‚'&W"’ÀÐ¢'Vä–C¢Ö¶T–B‚''Vâ"’ÀÐ¢Ó°Ð§ÐÐ Ð¦W‡÷'BgVæ7F–öâg&ÖWv÷&µ'VäW'&÷%&W7öç6R†W'&÷"Â²&WVW7D–BÂ'Vä–BÒ’°Ð¢6öç7B¶æ÷vâÒW'&÷"–ç7Fæ6Vöbg&ÖWv÷&µ'VäW'&÷#°Ð¢6öç7B7FGW2Ò¶æ÷vâòW'&÷"ç7FGW2¢S°Ð¢6öç7B–ÆöBÒ°Ð¢W'&÷#¢°Ð¢6öFS¢¶æ÷vâòW'&÷"æ6öFR¢&g&ÖWv÷&µ÷'Våöf–ÆVB"ÀÐ¢ÖW76vS¢¶æ÷vâòW'&÷"æÖW76vR¢%F†Rg&ÖWv÷&²'Vâf–ÆVBVæW‡V7FVFÇ’â"ÀÐ¢&WG'–&ÆS¢¶æ÷vâòW'&÷"ç&WG'–&ÆR¢fÇ6RÀÐ¢&WVW7D–BÀÐ¢'Vä–BÀÐ¢âââ†¶æ÷vâbbW'&÷"æFWF–Ç2ò²FWF–Ç3¢W'&÷"æFWF–Ç2Ò¢·Ò’ÀÐ¢ÒÀÐ¢Ó°Ð¢6öç7B†VFW'2Ò°Ð¢$66†RÔ6öçG&öÂ#¢&æò×7F÷&R"ÀÐ¢%‚Õ&WVW7BÔ–B#¢&WVW7D–BÀÐ¢âââ†¶æ÷vâbbW'&÷"æ†VFW'2òW'&÷"æ†VFW'2¢·Ò’ÀÐ¢Ó°Ð¢&WGW&â&W7öç6Ræ§6öâ‡–ÆöBÂ²7FGW2Â†VFW'2Ò“°Ð§ÐÐ 