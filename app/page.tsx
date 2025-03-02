import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Upload Your Video</h1>
          <Input type="file" accept="video/*" className="w-full max-w-md" />
          <Button className="mt-4">Upload</Button>
        </div>
    </div>
  );
}
