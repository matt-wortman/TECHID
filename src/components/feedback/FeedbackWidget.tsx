"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getOrCreateSessionId } from "@/lib/session";

type SubmissionState = "idle" | "submitting";

const MAX_MESSAGE_LENGTH = 1000;

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [pageUrl, setPageUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.pathname}${window.location.search}`;
      setPageUrl(url || "/");
    }
  }, []);

  const resetForm = useCallback(() => {
    setMessage("");
    setContactInfo("");
  }, []);

  const remainingCharacters = useMemo(() => MAX_MESSAGE_LENGTH - message.length, [message.length]);
  const isSubmitDisabled =
    submissionState === "submitting" || message.trim().length < 5 || message.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitDisabled) {
        return;
      }

      setSubmissionState("submitting");
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageUrl,
            message,
            contactInfo: contactInfo.trim() || undefined,
            userId: getOrCreateSessionId(),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const errorMessage = data?.error ?? "We couldn't save your feedback. Please try again.";
          toast.error(errorMessage);
          return;
        }

        toast.success("Thanks for the feedback!");
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error("Failed to submit feedback", error);
        toast.error("We couldn't submit your feedback. Please try again.");
      } finally {
        setSubmissionState("idle");
      }
    },
    [contactInfo, isSubmitDisabled, message, pageUrl, resetForm],
  );

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-[60] flex h-12 items-center gap-2 rounded-full px-5 shadow-lg md:bottom-8 md:right-8"
          size="lg"
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Feedback</DialogTitle>
          <DialogDescription>
            Let us know how the Tech Triage Platform is working for you. We review every submission.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="feedback-message">
              Your experience
            </label>
            <Textarea
              id="feedback-message"
              placeholder="What’s working well? What could be better?"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">{remainingCharacters} characters remaining</p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="feedback-contact">
              Contact info (optional)
            </label>
            <Input
              id="feedback-contact"
              placeholder="Email or phone if you’d like us to follow up"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              maxLength={200}
              type="text"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={submissionState === "submitting"}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {submissionState === "submitting" ? "Sending..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
