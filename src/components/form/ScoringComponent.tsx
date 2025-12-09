import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ScoringComponentProps {
  label: string;
  value: number;
  onChange: (score: number) => void;
  criteria: {
    0: string;
    1: string;
    2: string;
    3: string;
  };
  required?: boolean;
}

export function ScoringComponent({
  label,
  value,
  onChange,
  criteria,
  required = true,
}: ScoringComponentProps) {
  const [selectedScore, setSelectedScore] = useState(value);

  const handleScoreChange = (score: number) => {
    setSelectedScore(score);
    onChange(score);
  };

  const getScoreColor = (score: number) => {
    switch (score) {
      case 0:
        return "bg-red-100 border-red-300 text-red-800";
      case 1:
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case 2:
        return "bg-blue-100 border-blue-300 text-blue-800";
      case 3:
        return "bg-green-100 border-green-300 text-green-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label className="text-base font-medium">
          {label} {required && "*"}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div className="space-y-3">
              <h4 className="font-semibold">Scoring Criteria</h4>
              {Object.entries(criteria).map(([score, description]) => (
                <div key={score} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(Number(score))}`}>
                      {score}
                    </span>
                    <span className="text-sm">{description}</span>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex space-x-2">
        {[0, 1, 2, 3].map((score) => (
          <Button
            key={score}
            variant={selectedScore === score ? "default" : "outline"}
            className={`flex-1 h-12 ${
              selectedScore === score
                ? getScoreColor(score).replace("bg-", "bg-").replace("border-", "border-").replace("text-", "text-")
                : ""
            }`}
            onClick={() => handleScoreChange(score)}
          >
            <div className="text-center">
              <div className="text-lg font-bold">{score}</div>
              <div className="text-xs">
                {score === 0 && "Poor"}
                {score === 1 && "Fair"}
                {score === 2 && "Good"}
                {score === 3 && "Excellent"}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {selectedScore !== undefined && (
        <div className={`p-3 rounded-lg border ${getScoreColor(selectedScore)}`}>
          <p className="text-sm font-medium">Score {selectedScore}:</p>
          <p className="text-sm mt-1">{criteria[selectedScore as keyof typeof criteria]}</p>
        </div>
      )}
    </div>
  );
}