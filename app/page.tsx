import IsabelAutonomyLock from "./autonomy-lock";
import IsabelCommandChoreography from "./command-choreography";
import IsabelCommandConsole from "./command-console";
import IsabelGazeRuntime from "./gaze-runtime";
import IsabelGazeThreeBridge from "./gaze-three-bridge";
import IsabelSpeechRuntime from "./speech-runtime";

export default function Home() {
  return (
    <>
      <IsabelGazeThreeBridge />
      <IsabelGazeRuntime />
      <IsabelAutonomyLock />
      <IsabelCommandChoreography />
      <IsabelCommandConsole />
      <IsabelSpeechRuntime />
    </>
  );
}
