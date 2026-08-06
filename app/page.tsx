import IsabelAutonomyLock from "./autonomy-lock";
import IsabelCommandChoreography from "./command-choreography";
import IsabelCommandConsole from "./command-console";
import IsabelGazeRuntime from "./gaze-runtime";
import IsabelGazeThreeBridge from "./gaze-three-bridge";
import IsabelPlaceholderAnatomyBridge from "./placeholder-anatomy-bridge";
import IsabelSpeechRuntime from "./speech-runtime";

export default function Home() {
  return (
    <>
      <IsabelPlaceholderAnatomyBridge />
      <IsabelGazeThreeBridge />
      <IsabelGazeRuntime />
      <IsabelAutonomyLock />
      <IsabelCommandChoreography />
      <IsabelCommandConsole />
      <IsabelSpeechRuntime />
    </>
  );
}
