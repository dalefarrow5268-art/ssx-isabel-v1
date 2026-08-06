import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modelPath = path.join(root, "public", "models", "isabel", "isabel-v1.glb");

const requiredBones = ["Hips", "Spine", "Chest", "Neck", "Head", "LeftEye", "RightEye"];
const requiredMorphTargets = [
  "eyeBlinkLeft", "eyeBlinkRight", "jawOpen", "mouthSmileLeft", "mouthSmileRight", "browInnerUp",
  "viseme_sil", "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD", "viseme_kk", "viseme_CH",
  "viseme_SS", "viseme_nn", "viseme_RR", "viseme_aa", "viseme_E", "viseme_ih", "viseme_oh", "viseme_ou",
];
const requiredClips = [
  "Idle_Seated", "Idle_Standing", "Type", "Read", "Turn_Head", "Turn_Chair", "Stand", "Walk",
  "Stop", "Pivot", "Present_Small", "Listen", "Sit",
];

const contract = {
  modelPath: path.relative(root, modelPath),
  requiredBones,
  requiredMorphTargets,
  requiredClips,
};

if (!fs.existsSync(modelPath)) {
  console.error("Isabel GLB is not present yet.");
  console.error(`Expected: ${contract.modelPath}`);
  console.error(JSON.stringify(contract, null, 2));
  process.exit(1);
}

const stat = fs.statSync(modelPath);
if (!stat.isFile() || stat.size < 1024) {
  console.error("Isabel GLB exists but is not a valid production-sized file.");
  process.exit(1);
}

console.log(`Isabel GLB found: ${contract.modelPath}`);
console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
console.log("Binary presence check passed. Structural GLB inspection is the next validator stage.");
console.log(JSON.stringify(contract, null, 2));
