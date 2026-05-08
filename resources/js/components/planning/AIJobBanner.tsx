import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface AIJobData {
  assembly?: string;
  assemblyDesc?: string;
  uom?: string;
  salesOrder?: string;
  jobType?: string;
  jobClass?: string;
  status?: string;
  quantity?: string;
  startDate?: string;
  completionDate?: string;
  firm?: boolean;
  priority?: string;
  notes?: string;
}

interface AIJobBannerProps {
  onDataExtracted: (data: AIJobData) => void;
}

export const AIJobBanner = ({ onDataExtracted }: AIJobBannerProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filledCount, setFilledCount] = useState(0);
  const [chips, setChips] = useState<string[]>([]);

  const handleAutoFill = async () => {
    if (!prompt.trim()) {
      toast({ title: "Empty Prompt", description: "Describe the job you want to create", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-job-description", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Count filled fields
      let count = 0;
      const newChips: string[] = [];
      
      if (data.assembly) count++;
      if (data.quantity) count++;
      if (data.salesOrder) { count++; newChips.push(`🔗 Linked to ${data.salesOrder}`); }
      if (data.startDate) count++;
      if (data.completionDate) count++;
      if (data.priority === "High") { count++; newChips.push("⚡ High Priority"); }
      if (data.firm) { count++; newChips.push("📌 Marked as Firm"); }
      if (data.jobClass === "REWORK") newChips.push("🔄 Rush/Rework Class");
      if (data.uom) count++;
      if (data.assemblyDesc) count++;
      if (data.notes) count++;

      setFilledCount(count);
      setChips(newChips);
      onDataExtracted(data);

      toast({
        title: `✦ AI filled ${count} fields`,
        description: "Review and adjust as needed",
      });
    } catch (err: any) {
      console.error("AI auto-fill error:", err);
      toast({
        title: "AI Auto-fill Failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* AI Banner */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/80 to-sky-50/80 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-sky-500 shadow-md animate-pulse">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              ✦ AI Job Setup
            </p>
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g. "10 units of PCB Assembly for SO-1042, start Monday, urgent"'
                className="flex-1 border-purple-200 bg-white/80 text-sm placeholder:text-muted-foreground focus-visible:ring-purple-400"
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAutoFill()}
              />
              <Button
                onClick={handleAutoFill}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-sky-500 text-white font-bold hover:from-purple-700 hover:to-sky-600 shadow-md"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Auto-fill
                  </>
                )}
              </Button>
            </div>

            {/* Suggestion chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {chips.map((chip, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-purple-200 bg-purple-50/50 text-purple-700 text-[10px] font-medium"
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Status in footer area */}
      {filledCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI filled {filledCount} fields
        </div>
      )}
    </div>
  );
};
