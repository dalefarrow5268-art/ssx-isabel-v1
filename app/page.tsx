import IsabelAutonomyLock from "./autonomy-lock";
import IsabelCommandChoreography from "./command-choreography";
import IsabelCommandConsole from "./command-console";
import IsabelSpeechRuntime from "./speech-runtime";

export default function Home() {
  return (
    <>
      <IsabelAutonomyLock />
      <IsabelCommandChoreography />
      <IsabelCommandConsole />
      <IsabelSpeechRuntime />
    </>
  );
}
