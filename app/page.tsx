import IsabelAutonomyLock from "./autonomy-lock";
import IsabelCommandConsole from "./command-console";
import IsabelSpeechRuntime from "./speech-runtime";

export default function Home() {
  return (
    <>
      <IsabelAutonomyLock />
      <IsabelCommandConsole />
      <IsabelSpeechRuntime />
    </>
  );
}
